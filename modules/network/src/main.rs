use std::io;
use std::env;
use std::process;
use std::io::Write;
use std::{thread, time};
use std::sync::mpsc::TryRecvError;
use std::sync::mpsc::Receiver;
use pnet::datalink::{self, NetworkInterface};
use pnet::packet::ethernet::EthernetPacket;

mod packethandler;
use packethandler::handle_ethernet_frame;

mod gmcp;

struct EventLoopParams {
	iteration_sleep_ms: u64,
	should_exit: bool,
}

fn convert_command_to_params(input_container: &gmcp::read::InputContainer) -> EventLoopParams {
	// write logic to convert commands to params. Handle update configs, throttles, kills, etc
	EventLoopParams {
		iteration_sleep_ms: 0,
		should_exit: false,
	}
}

fn main() {
	use pnet::datalink::Channel::Ethernet;

	let iface_name = match env::args().nth(1) {
		Some(n) => n,
		None => {
			writeln!(io::stderr(), "USAGE: network <NETWORK INTERFACE>").unwrap();
			process::exit(1);
		}
	};
	let interface_names_match = |iface: &NetworkInterface| iface.name == iface_name;

	// Find the network interface with the provided name
	let interfaces = datalink::interfaces();
	let interface = interfaces
		.into_iter()
		.filter(interface_names_match)
		.next()
		.unwrap_or_else(|| panic!("No such network interface: {}", iface_name));

	// Create a channel to receive network data on
	let (_, mut net_rx) = match datalink::channel(&interface, Default::default()) {
		Ok(Ethernet(tx, rx)) => (tx, rx),
		Ok(_) => panic!("ganchos network module: unhandled channel type: {}"),
		Err(e) => panic!("ganchos network module: unable to create channel: {}", e),
	};

	let mut params = EventLoopParams {
		iteration_sleep_ms: 0,
		should_exit: false,
	};

	let stdin_channel = gmcp::read::spawn_stdin_channel();

	loop {
		let new_commands = run_event_loop(&interface, &mut net_rx, &stdin_channel, &params);
		params = convert_command_to_params(&new_commands);
		if params.should_exit { 
			println!("Shutting down gracefully, goodbye");
			process::exit(0);
		}
	}
}

fn run_event_loop(interface: &datalink::NetworkInterface, 
		      net_rx: &mut std::boxed::Box<dyn datalink::DataLinkReceiver>, 
			  stdin_channel: &Receiver<String>,
			  params: &EventLoopParams) -> gmcp::read::InputContainer {

	let sleep_time = time::Duration::from_millis(params.iteration_sleep_ms);

	loop {
		match stdin_channel.try_recv() {
			Ok(message) => {
				// New command came in, exit out of event loop so it can restart w/ new parameters
				let input_container = gmcp::read::InputContainer::new(&message);
				if input_container.commands.len() > 0 {return input_container;}
			}
			Err(TryRecvError::Empty) => {},
			Err(TryRecvError::Disconnected) => panic!("Channel disconnected"),
		}

		match net_rx.next() {
			Ok(packet) => {
				match handle_ethernet_frame(&interface, &EthernetPacket::new(packet).unwrap()) {
					Some(event_data) => gmcp::Event {
							event_type: String::from(gmcp::EventType::PACKET_MATCH),
							data: event_data
						}.push_out(),
					None => {},
				}
			}
			Err(e) => panic!("ganchos network module: unable to receive packet: {}", e),
		}

		thread::sleep(sleep_time);
	}
}
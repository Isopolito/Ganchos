use pnet::datalink::{self, NetworkInterface};
use pnet::packet::ethernet::EthernetPacket;
use std::env;
use std::io;
use std::io::Write;
use std::process;
use std::sync::mpsc::Receiver;
use std::sync::mpsc::TryRecvError;
use std::{thread, time};
use serde::{Serialize};
mod packet_handler;
use packet_handler::handle_ethernet_frame;

mod event_loop;
mod gmcp;

#[derive(Serialize)]
struct RegexFilter {
	protocol: String,
	source_ip: String,
	dest_ip: String,
	payload: String,
}

#[derive(Serialize)]
struct Config {
	regex_filters: Vec<RegexFilter> ,
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

	let mut params = event_loop::Params::new_with_defaults();
	let stdin_channel = gmcp::read::spawn_stdin_channel();
	let default_config = Config{
		regex_filters: vec![RegexFilter {
			protocol: String::from("ip4"),
			source_ip: String::from("32.232.232.323"),
			dest_ip: String::from("192.*"),
			payload: String::from(""),
		}],
	};
	let config_json = serde_json::to_string(&default_config).unwrap();

	loop {
		let input_container = run_event_loop(&interface, &mut net_rx, &stdin_channel, &params);
		params = event_loop::Params::new(&input_container.commands);
		
		if params.should_show_default_config {
			params.should_show_default_config = false;
			println!("{}", config_json);
			//io::stdout()
			//.write_all(config_json.as_bytes())
			//.expect("gmcp: unable to write to stdout");
		}

		if params.should_show_example_config {
			params.should_show_example_config = false;
			println!("{}", config_json);
			//io::stdout()
			//.write_all(config_json.as_bytes())
			//.expect("gmcp: unable to write to stdout");
		}

		if params.should_exit {
			println!("Shutting down gracefully, goodbye");
			process::exit(0);
		}
	}
}

fn run_event_loop(
	interface: &datalink::NetworkInterface,
	net_rx: &mut std::boxed::Box<dyn datalink::DataLinkReceiver>,
	stdin_channel: &Receiver<String>,
	params: &event_loop::Params,
) -> gmcp::read::InputContainer {
	let sleep_time = time::Duration::from_millis(params.iteration_sleep_ms);
	let pause_sleep_time = time::Duration::from_millis(10);

	let mut counter: u8 = 0;
	loop {
		// No need to check stdin for commands every iteration of loop
		if counter == 10 {
			counter = 0;
			match stdin_channel.try_recv() {
				Ok(message) => {
					let input_container = gmcp::read::InputContainer::new(&message);
					if input_container.commands.len() > 0 {
						// New command came in, exit out of event loop so it can restart w/ new parameters
						return input_container;
					}
				}
				Err(TryRecvError::Empty) => {}
				Err(TryRecvError::Disconnected) => panic!("Channel disconnected"),
			}
		}
		counter += 1;


		if !params.should_pause {
			// NOTE: If packets don't come in, the code will be sitting here waiting, and not picking 
			// up commands (I think). This could be a problem if network is not active
			//match net_rx.next() {
			//	Ok(packet) => {
			//		match handle_ethernet_frame(&interface, &EthernetPacket::new(packet).unwrap()) {
			//			Some(event_data) => gmcp::Event {
			//				event_type: String::from(gmcp::EventType::PACKET_MATCH),
			//				data: event_data,
			//			}
			//			.push_out(),
			//			None => {}
			//		}
			//	}
			//	Err(e) => panic!("ganchos network module: unable to receive packet: {}", e),
			//}
		}

		if params.iteration_sleep_ms > 0 {
			thread::sleep(sleep_time);
		} else if params.should_pause {
			thread::sleep(pause_sleep_time);
		}
	}
}

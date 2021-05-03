use std::env;
use std::io;
use std::sync::mpsc;
use std::sync::mpsc::Receiver;
use std::sync::mpsc::TryRecvError;
use std::{thread};
use std::io::{Write};
use std::process;
use pnet::datalink::{self, NetworkInterface};
use pnet::packet::ethernet::{EthernetPacket};
mod packethandler;
use packethandler::handle_ethernet_frame;
mod gmcp;

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

    // Create a channel to receive on
    let (_, mut rx) = match datalink::channel(&interface, Default::default()) {
        Ok(Ethernet(tx, rx)) => (tx, rx),
        Ok(_) => panic!("ganchos network module: unhandled channel type: {}"),
        Err(e) => panic!("ganchos network module: unable to create channel: {}", e),
    };

    let stdin_channel = spawn_stdin_channel();
	let mut counter: u8 = 0;
    loop {
		if counter == 10 {
			match stdin_channel.try_recv() {
				Ok(key) => println!("Received: {}", key),
				Err(TryRecvError::Empty) => println!("Channel empty"),
				Err(TryRecvError::Disconnected) => panic!("Channel disconnected"),
			}
			
			counter = 0;
		}
		counter += 1;

        match rx.next() {
            Ok(packet) => {
                let event_data = handle_ethernet_frame(&interface, &EthernetPacket::new(packet).unwrap());
			}
            Err(e) => panic!("packetdump: unable to receive packet: {}", e),
		}
    }
}

fn spawn_stdin_channel() -> Receiver<String> {
    let (tx, rx) = mpsc::channel::<String>();
    thread::spawn(move || loop {
        let mut buffer = String::new();
        io::stdin().read_line(&mut buffer).unwrap();
        tx.send(buffer).unwrap();
    });
    rx
}
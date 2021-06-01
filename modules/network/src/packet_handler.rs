// The foundation of this code is taken from libpnet packet dump example: https://github.com/libpnet/libpnet/blob/master/examples/packetdump.rs
extern crate pnet;

use pnet::datalink::NetworkInterface;
use pnet::packet::arp::ArpPacket;
use pnet::packet::ethernet::{EtherTypes, EthernetPacket};
use pnet::packet::icmp::{echo_reply, echo_request, IcmpPacket, IcmpTypes};
use pnet::packet::icmpv6::Icmpv6Packet;
use pnet::packet::ip::{IpNextHeaderProtocol, IpNextHeaderProtocols};
use pnet::packet::ipv4::Ipv4Packet;
use pnet::packet::ipv6::Ipv6Packet;
use pnet::packet::tcp::TcpPacket;
use pnet::packet::udp::UdpPacket;
use pnet::packet::Packet;
use std::net::IpAddr;

use crate::config::Config;
use crate::gmcp::EventData;

fn handle_udp_packet(
	interface_name: &str,
	source: IpAddr,
	destination: IpAddr,
	packet: &[u8],
	config: &mut Config,
) -> Option<EventData> {
	let udp = UdpPacket::new(packet);

	if let Some(udp) = udp {
		let source_ip = format!("{}", source);
		let source_port = udp.get_source();
		let dest_ip = format!("{}", destination); // TODO: find better way
		let dest_port = udp.get_destination();
		let payload = &String::from_utf8_lossy(udp.payload());
		let size = udp.get_length();

		let mut did_not_find_match = true;
		for filter in config.filters.iter_mut() {
			if filter.is_match(&source_ip, source_port, &dest_ip, dest_port, size, payload) {
				did_not_find_match = false;
				break;
			}
		}
		if did_not_find_match { return None; }

		Some(EventData {
			data_type: String::from("udp"),
			data: format!(
				r#"{{ "interfaceName": "{}", 
						"sourceIp": "{}", 
						"sourcePort": {}, 
						"destIp": "{}", 
						"destPort": {}, 
						"size": {}, 
						"payload": "{}", 
					}}"#,
				interface_name,
				source_ip,
				source_port,
				dest_ip,
				dest_port,
				size,
				payload
			),
		})
	} else {
		None
	}
}

fn handle_icmp_packet(
	interface_name: &str,
	source: IpAddr,
	destination: IpAddr,
	packet: &[u8],
	config: &mut Config,
) -> Option<EventData> {
	let icmp_packet = IcmpPacket::new(packet);
	if let Some(icmp_packet) = icmp_packet {
		let source_ip = format!("{}", source);
		let dest_ip = format!("{}", destination); // TODO: find better way

		let mut did_not_find_match = true;
		for filter in config.filters.iter_mut() {
			if filter.is_match(&source_ip, 0, &dest_ip, 0, 0, "") {
				did_not_find_match = false;
				break;
			}
		}
		if did_not_find_match { return None; }

		match icmp_packet.get_icmp_type() {
			IcmpTypes::EchoReply => {
				let echo_reply_packet = echo_reply::EchoReplyPacket::new(packet).unwrap();
				return Some(EventData {
					data_type: String::from("echoReply"),
					data: format!(
						r#"{{ "interfaceName": "{}", 
								"sourceIp": "{}", 
								"destIp": "{}", 
								"seqNumber": "{}", 
								"identifier": "{}", 
							}}"#,
						interface_name,
						source,
						destination,
						echo_reply_packet.get_sequence_number(),
						echo_reply_packet.get_identifier()
					),
				});
			}
			IcmpTypes::EchoRequest => {
				let echo_request_packet = echo_request::EchoRequestPacket::new(packet).unwrap();
				return Some(EventData {
					data_type: String::from("echoRequest"),
					data: format!(
						r#"{{ "interfaceName": "{}", 
								"sourceIp": "{}", 
								"destIp": "{}", 
								"seqNumber": "{}", 
								"identifier": "{}", 
							}}"#,
						interface_name,
						source_ip,
						dest_ip,
						echo_request_packet.get_sequence_number(),
						echo_request_packet.get_identifier()
					),
				});
			}
			_ => None,
		}
	} else {
		None
	}
}

fn handle_icmpv6_packet(
	interface_name: &str,
	source: IpAddr,
	destination: IpAddr,
	packet: &[u8],
	config: &mut Config,
) -> Option<EventData> {
	let icmpv6_packet = Icmpv6Packet::new(packet);
	if let Some(icmpv6_packet) = icmpv6_packet {
		let source_ip = format!("{}", source);
		let dest_ip = format!("{}", destination); // TODO: find better way

		let mut did_not_find_match = true;
		for filter in config.filters.iter_mut() {
			if filter.is_match(&source_ip, 0, &dest_ip, 0, 0, "") {
				did_not_find_match = false;
				break;
			}
		}
		if did_not_find_match { return None; }

		Some(EventData {
			data_type: String::from("icmpv6"),
			data: format!(
				r#"{{ "interfaceName": "{}", 
						"sourceIp": "{}", 
						"destIp": "{}", 
						"type": "(type={:?})", 
					}}"#,
				interface_name,
				source_ip,
				dest_ip,
				icmpv6_packet.get_icmpv6_type()
			),
		})
	} else {
		None
	}
}

fn handle_tcp_packet(
	interface_name: &str,
	source: IpAddr,
	destination: IpAddr,
	packet: &[u8],
	config: &mut Config,
) -> Option<EventData> {
	let tcp = TcpPacket::new(packet);
	if let Some(tcp) = tcp {
		let source_ip = format!("{}", source);
		let source_port = tcp.get_source();
		let dest_ip = format!("{}", destination); // TODO: find better way
		let dest_port = tcp.get_destination();
		let payload = &String::from_utf8_lossy(tcp.payload());
		let size = packet.len();

		let mut did_not_find_match = true;
		for filter in config.filters.iter_mut() {
			if filter.is_match(&source_ip, source_port, &dest_ip, dest_port, size as u16, payload) {
				did_not_find_match = false;
				break;
			}
		}
		if did_not_find_match { return None; }

		Some(EventData {
			data_type: String::from("tcp"),
			data: format!(
				r#"{{ "interfaceName": "{}", 
				  "sourceIp": "{}", 
				  "sourcePort": {}, 
				  "destIp": "{}", 
				  "destPort": {}, 
				  "size": {}, 
				  "payload": "{}", 
			}}"#,
				interface_name,
				source_ip,
				source_port,
				dest_ip,
				dest_port,
				size,
				payload
			),
		})
	} else {
		None
	}
}

fn handle_transport_protocol(
	interface_name: &str,
	source: IpAddr,
	destination: IpAddr,
	protocol: IpNextHeaderProtocol,
	packet: &[u8],
	config: &mut Config,
) -> Option<EventData> {
	return match protocol {
		IpNextHeaderProtocols::Udp => {
			handle_udp_packet(interface_name, source, destination, packet, config)
		}
		IpNextHeaderProtocols::Tcp => {
			handle_tcp_packet(interface_name, source, destination, packet, config)
		}
		IpNextHeaderProtocols::Icmp => {
			handle_icmp_packet(interface_name, source, destination, packet, config)
		}
		IpNextHeaderProtocols::Icmpv6 => {
			handle_icmpv6_packet(interface_name, source, destination, packet, config)
		}
		_ => None,
	};
}

fn handle_ipv4_packet(
	interface_name: &str,
	ethernet: &EthernetPacket,
	config: &mut Config,
) -> Option<EventData> {
	let header = Ipv4Packet::new(ethernet.payload());
	if let Some(header) = header {
		handle_transport_protocol(
			interface_name,
			IpAddr::V4(header.get_source()),
			IpAddr::V4(header.get_destination()),
			header.get_next_level_protocol(),
			header.payload(),
			config,
		)
	} else {
		None
	}
}

fn handle_ipv6_packet(
	interface_name: &str,
	ethernet: &EthernetPacket,
	config: &mut Config,
) -> Option<EventData> {
	let header = Ipv6Packet::new(ethernet.payload());
	if let Some(header) = header {
		handle_transport_protocol(
			interface_name,
			IpAddr::V6(header.get_source()),
			IpAddr::V6(header.get_destination()),
			header.get_next_header(),
			header.payload(),
			config,
		)
	} else {
		None
	}
}

fn handle_arp_packet(
	interface_name: &str,
	ethernet: &EthernetPacket,
	config: &mut Config,
) -> Option<EventData> {
	let header = ArpPacket::new(ethernet.payload());
	if let Some(header) = header {
		let source_ip = format!("{}", ethernet.get_source());
		let dest_ip = format!("{}", ethernet.get_destination());

		let mut did_not_find_match = true;
		for filter in config.filters.iter_mut() {
			if filter.is_match(&source_ip, 0, &dest_ip, 0, 0, "") {
				did_not_find_match = false;
				break;
			}
		}
		if did_not_find_match { return None; }

		Some(EventData {
			data_type: String::from("arp"),
			data: format!(
				r#"{{ "interfaceName": "{}", 
				  "sourceIp": "{}", 
				  "senderProto": "{}", 
				  "destIp": "{}", 
				  "destProto": "{}", 
				  "operation": "{}", 
					}}"#,
				interface_name,
				source_ip,
				header.get_sender_proto_addr(),
				dest_ip,
				header.get_target_proto_addr(),
				"todo" //header.get_operation()
			),
		})
	} else {
		None
	}
}

//////////////////////////////////////////////////////////////////////////////////////////

pub fn handle_ethernet_frame(
	interface: &NetworkInterface,
	ethernet: &EthernetPacket,
	config: &mut Config,
) -> Option<EventData> {
	let interface_name = &interface.name[..];
	match ethernet.get_ethertype() {
		EtherTypes::Ipv4 => handle_ipv4_packet(interface_name, ethernet, config),
		EtherTypes::Ipv6 => handle_ipv6_packet(interface_name, ethernet, config),
		EtherTypes::Arp => handle_arp_packet(interface_name, ethernet, config),
		_ => None,
	}
}
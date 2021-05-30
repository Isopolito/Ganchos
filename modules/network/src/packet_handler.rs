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

use crate::config;
use crate::gmcp::EventData;

fn handle_udp_packet(
	interface_name: &str,
	source: IpAddr,
	destination: IpAddr,
	packet: &[u8],
	config: &config::Config,
) -> Option<EventData> {
	let udp = UdpPacket::new(packet);

	if let Some(udp) = udp {
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
				format!("{}", source),
				udp.get_source(),
				format!("{}", destination), // TODO: find better way
				udp.get_destination(),
				udp.get_length(),
				&String::from_utf8_lossy(udp.payload()),
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
	config: &config::Config,
) -> Option<EventData> {
	let icmp_packet = IcmpPacket::new(packet);
	if let Some(icmp_packet) = icmp_packet {
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
						source,
						destination,
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
	config: &config::Config,
) -> Option<EventData> {
	let icmpv6_packet = Icmpv6Packet::new(packet);
	if let Some(icmpv6_packet) = icmpv6_packet {
		Some(EventData {
			data_type: String::from("icmpv6"),
			data: format!(
				r#"{{ "interfaceName": "{}", 
						"sourceIp": "{}", 
						"destIp": "{}", 
						"type": "(type={:?})", 
					}}"#,
				interface_name,
				source,
				destination,
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
	config: &config::Config,
) -> Option<EventData> {
	let tcp = TcpPacket::new(packet);
	if let Some(tcp) = tcp {
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
				source,
				tcp.get_source(),
				destination,
				tcp.get_destination(),
				packet.len(),
				String::from_utf8_lossy(tcp.payload()),
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
	config: &config::Config,
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
	config: &config::Config,
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
	config: &config::Config,
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
	config: &config::Config,
) -> Option<EventData> {
	let header = ArpPacket::new(ethernet.payload());
	if let Some(header) = header {
		println!(
			"[{}]: ARP packet: {}({}) > {}({}); operation: {:?}",
			interface_name,
			ethernet.get_source(),
			header.get_sender_proto_addr(),
			ethernet.get_destination(),
			header.get_target_proto_addr(),
			header.get_operation()
		);
	} else {
		println!("[{}]: Malformed ARP Packet", interface_name);
		return None;
	}
	Some(EventData {
		data_type: String::from("arp"),
		data: String::from("packet info goes here"),
	})
}

//////////////////////////////////////////////////////////////////////////////////////////

pub fn handle_ethernet_frame(
	interface: &NetworkInterface,
	ethernet: &EthernetPacket,
	config: &config::Config,
) -> Option<EventData> {
	let interface_name = &interface.name[..];
	match ethernet.get_ethertype() {
		EtherTypes::Ipv4 => return handle_ipv4_packet(interface_name, ethernet, &config),
		EtherTypes::Ipv6 => return handle_ipv6_packet(interface_name, ethernet, &config),
		EtherTypes::Arp => return handle_arp_packet(interface_name, ethernet, &config),
		_ => {
			println!(
				"[{}]: Unknown packet: {} > {}; ethertype: {:?} length: {}",
				interface_name,
				ethernet.get_source(),
				ethernet.get_destination(),
				ethernet.get_ethertype(),
				ethernet.packet().len()
			);
			return None;
		}
	}
}

#![allow(unused_variables)]
#![allow(dead_code)]

use std::io;
use std::io::Write;
use chrono::{DateTime, Utc};
use serde::{Deserialize};

pub mod read;

pub trait Serialization {
	fn to_json(&self) -> String;
}

// message (outer most layer of all communication)
pub const MESSAGE_TAG_OPEN: &str = "<<GMCP>>";
pub const MESSAGE_TAG_CLOSE: &str = "<</GMCP>>";

pub struct MessageType;
impl MessageType {
	pub const EVENT: &'static str = "event";
	pub const GENERAL_LOG: &'static str = "generalLog";
	pub const COMMAND: &'static str = "command";
}

#[derive(Deserialize)]
pub struct Message {
	#[serde(alias = "type")] 
	pub message_type: String,

	pub data: String,
}
impl Message {
	pub fn create_event_message<'a>(event: &Event) -> Message {
		Message {
			message_type: String::from(MessageType::EVENT),
			data: event.to_json()
		}
	}
	pub fn create_general_log_message<'a>(log: &GeneralLog) -> Message {
		Message {
			message_type: String::from(MessageType::GENERAL_LOG),
			data: log.to_json()
		}
	}
	pub fn create_command_message<'a>(command: &Command) -> Message {
		Message {
			message_type: String::from(MessageType::COMMAND),
			data: command.to_json()
		}
	}
}
impl Serialization for Message {
	fn to_json(&self) -> String {
		format!(r#"{}{{"type": "{}", "data": "{}"}}{}"#,
			MESSAGE_TAG_OPEN,
			self.message_type,
			self.data,
			MESSAGE_TAG_CLOSE,
		)
	}
}

// events
pub struct EventType;
impl EventType {
	pub const ADD_FILE: &'static str = "addFile";
	pub const ADD_DIR: &'static str = "addDir";
	pub const CHANGE_FILE: &'static str = "changeFile";
	pub const UNLINK_FILE: &'static str = "unlinkFile";
	pub const UNLINK_DIR: &'static str = "unlinkDir";
	pub const INET_UP: &'static str = "inetUp";
	pub const INET_DOWN: &'static str = "inetDown";
	pub const IP_CHANGE: &'static str = "ipChange";
	pub const PACKET_MATCH: &'static str = "packetMatch";
	pub const NONE: &'static str = "none";
}

#[derive(Deserialize)]
pub struct EventData  {
	#[serde(alias = "type")] 
	pub data_type: String,

	pub data: String,
}
impl Serialization for EventData{
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				self.data_type, self.data)
	}
}

#[derive(Deserialize)]
pub struct Event {
	#[serde(alias = "type")] 
	pub event_type: String,

	pub data: EventData,
}
impl Event {
	pub fn push_out(&self) {
		io::stdout()
			.write_all(self.to_json().as_bytes())
			.expect("gmcp: unable to write to stdout");
	}
}
impl Serialization for Event {
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				&self.event_type, &self.data.to_json())
	}
}

// logging
pub struct GeneralLog {
	pub severity: String,
	pub area: String,
	pub message: String,
	pub timestamp: DateTime<Utc>,
}
impl Serialization for GeneralLog {
	fn to_json(&self) -> String {
		format!(r#"{{"severity": "{}", "area": "{}", "timestamp": "{}", "message": "{}"}}"#,
				&self.severity, 
				&self.area,
				self.timestamp.to_rfc3339(),
				self.message)
	}
}

// commands
pub struct CommandType;
impl CommandType {
	pub const START: &'static str = "start";
	pub const STOP: &'static str = "stop";
	pub const PAUSE: &'static str = "pause";
	pub const THROTTLE: &'static str = "throttle";
	pub const UPDATE_CONFIG: &'static str = "updateConfig";
	pub const SHOW_DEFAULT_CONFIG: &'static str = "showDefaultConfig";
	pub const SHOW_EXAMPLE_CONFIG: &'static str = "showExampleConfig";
}

#[derive(Deserialize)]
pub struct Command {
	#[serde(alias = "type")] 
	pub command_type: String,

	pub data: String,
}
impl Command {
	pub fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				self.command_type, self.data)
	}
}

#[cfg(test)]
mod tests {
    use super::*;

	//    #[test]
	//    fn print_command_message() {
	//
	//		let command = Command {
	//			command_type: CommandType::START,
	//			data: ""
	//		};
	//		let message = Message::create_command_message(&command);
	//		assert_eq!("{}", message.to_json());
	//    }

    #[test]
    fn serialize_command() {
		let command = Command {
			command_type: String::from(CommandType::THROTTLE),
			data: String::from("20")
		};
        assert_eq!(command.to_json(), r#"{"type": "throttle", "data": "20"}"#);
    }

    #[test]
    fn serialize_event() {
		let event_data = EventData {
			data_type: "packet info",
			data: String::from("information")
		};

		let event = Event {
			event_type: EventType::PACKET_MATCH,
			data: event_data,
		};
        assert_eq!(event.to_json(), r#"{"type": "packetMatch", "data": "{"type": "packet info", "data": "information"}"}"#);
    }

   #[test]
    fn serialize_general_log() {
		let now_time = Utc::now();
		let log_message = GeneralLog {
			severity: String::from("error"),
			area: String::from("area"),
			message: String::from("log message"),
			timestamp: now_time,
		};

		let serialized_baseline = format!(r#"{{"severity": "error", "area": "area", "timestamp": "{}", "message": "log message"}}"#,
										now_time.to_rfc3339());
        assert_eq!(log_message.to_json(), serialized_baseline);
    }

    #[test]
    fn serialize_message() {
		let command = Command {
			command_type: String::from(CommandType::THROTTLE),
			data: String::from("90")
		};

		let message = Message::create_command_message(&command);

        assert_eq!(message.to_json(), r#"<<GMCP>>{"type": "command", "data": "{"type": "throttle", "data": "90"}"}<</GMCP>>"#);
    }
}
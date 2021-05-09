#![allow(unused_variables)]
#![allow(dead_code)]

use chrono::{DateTime, Utc};

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

pub struct Message<'a> {
	pub message_type: &'a str,
	pub data: String,
}
impl Message<'_> {
	pub fn create_event_message<'a>(event: &Event) -> Message<'a> {
		Message {
			message_type: MessageType::EVENT,
			data: event.to_json()
		}
	}
	pub fn create_general_log_message<'a>(log: &GeneralLog) -> Message<'a> {
		Message {
			message_type: MessageType::GENERAL_LOG,
			data: log.to_json()
		}
	}
	pub fn create_command_message<'a>(command: &Command) -> Message<'a> {
		Message {
			message_type: MessageType::COMMAND,
			data: command.to_json()
		}
	}
}
impl Serialization for Message<'_> {
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

pub struct EventData<'a> {
	pub data_type: &'a str,
	pub data: &'a str,
}
impl Serialization for EventData<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				self.data_type, self.data)
	}
}

pub struct Event<'a> {
	pub event_type: &'a str,
	pub data: EventData<'a>,
}
impl Serialization for Event<'_>{
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				&self.event_type, &self.data.to_json())
	}
}

// logging
pub struct GeneralLog<'a> {
	pub severity: &'a str,
	pub area: &'a str,
	pub message: &'a str,
	pub timestamp: DateTime<Utc>,
}
impl Serialization for GeneralLog<'_> {
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
}

pub struct Command<'a> {
	pub command_type: &'a str,
	pub data: &'a str,
}
impl Command<'_> {
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
			command_type: CommandType::THROTTLE,
			data: "20"
		};
        assert_eq!(command.to_json(), r#"{"type": "throttle", "data": "20"}"#);
    }

    #[test]
    fn serialize_event() {
		let event_data = EventData {
			data_type: "packet info",
			data: "information"
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
			severity: "error",
			area: "area",
			message: "log message",
			timestamp: now_time,
		};

		let serialized_baseline = format!(r#"{{"severity": "error", "area": "area", "timestamp": "{}", "message": "log message"}}"#,
										now_time.to_rfc3339());
        assert_eq!(log_message.to_json(), serialized_baseline);
    }

    #[test]
    fn serialize_message() {
		let command = Command {
			command_type: CommandType::THROTTLE,
			data: "90"
		};

		let message = Message::create_command_message(&command);

        assert_eq!(message.to_json(), r#"<<GMCP>>{"type": "command", "data": "{"type": "throttle", "data": "90"}"}<</GMCP>>"#);
    }

}
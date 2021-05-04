#![allow(unused_variables)]
#![allow(dead_code)]

use chrono::{DateTime, Utc};

// message (outer most layer of all communication)
pub const MESSAGE_TAG_OPEN: &str = "<<GMCP>>";
pub const MESSAGE_TAG_CLOSE: &str = "<</GMCP>>";

pub struct MessageType;
impl MessageType {
	const EVENT: &'static str = "event";
	const GENERAL_LOG: &'static str = "generalLog";
	const COMMAND: &'static str = "command";
}

pub struct Message<'a> {
	message_type: &'a str,
	data: String,
}
impl Message<'_> {
	fn create_event_message(&self, event: &Event) -> Message {
		Message {
			message_type: MessageType::EVENT,
			data: event.to_json()
		}
	}
	fn create_general_log_message(&self, log: &GeneralLog) -> Message {
		Message {
			message_type: MessageType::GENERAL_LOG,
			data: log.to_json()
		}
	}
	fn create_command_message(&self, command: &Command) -> Message {
		Message {
			message_type: MessageType::COMMAND,
			data: command.to_json()
		}
	}
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
	const ADD_FILE: &'static str = "addFile";
	const ADD_DIR: &'static str = "addDir";
	const CHANGE_FILE: &'static str = "changeFile";
	const UNLINK_FILE: &'static str = "unlinkFile";
	const UNLINK_DIR: &'static str = "unlinkDir";
	const INET_UP: &'static str = "inetUp";
	const INET_DOWN: &'static str = "inetDown";
	const IP_CHANGE: &'static str = "ipChange";
	const PACKET_MATCH: &'static str = "packetMatch";
	const NONE: &'static str = "none";
}

pub struct EventData<'a> {
	data_type: &'a str,
	data: &'a str,
}
impl EventData<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				self.data_type, self.data)
	}
}

pub struct Event<'a> {
	event_type: &'a str,
	data: EventData<'a>,
}
impl Event<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				&self.event_type, &self.data.to_json())
	}
}

// logging
pub struct GeneralLog<'a> {
	severity: &'a str,
	area: &'a str,
	message: &'a str,
	timestamp: DateTime<Utc>,
}
impl GeneralLog<'_> {
	fn to_json(&self) -> String {
		// TODO: debug this logic and figure out what an uninitialized DateTime<Utc> looks like
		//self.timestamp = if self.timestamp { self.timestamp } else { Utc::now() };
		format!(r#"{{"severity": "{}", "area": "{}", "timestamp": {}, "message": "{}"}}"#,
				&self.severity, 
				&self.area,
				self.timestamp.to_rfc3339(),
				self.message)
	}
}

// commands
pub struct CommandType;
impl CommandType {
	const START: &'static str = "start";
	const STOP: &'static str = "stop";
	const PAUSE: &'static str = "pause";
	const THROTTLE: &'static str = "throttle";
	const UPDATE_CONFIG: &'static str = "updateConfig";
}

pub struct Command<'a> {
	command_type: &'a str,
	data: &'a str,
}
impl Command<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"type": "{}", "data": "{}"}}"#,
				self.command_type, self.data)
	}
}

#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[test]
    fn serialize_command() {
		let command = Command {
			command_type: CommandType::THROTTLE,
			data: "20"
		};
        assert_eq!(command.to_json() , r#"{"type": "throttle", "data": "20"}"#);
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
        assert_eq!(event.to_json() , r#"{"type": "packetMatch", "data": "{"type": "packet info", "data": "information"}"}"#);
    }
}
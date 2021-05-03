#![allow(unused_variables)]
#![allow(dead_code)]
use chrono::{Datelike, Timelike, Utc};

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
	payload: String, // json
}
impl Message<'_> {
	fn create_event_message(&self, event: &Event) -> Message {
		Message {
			message_type: MessageType::EVENT,
			payload: event.to_json()
		}
	}
	fn create_general_log_message(&self, log: &GeneralLog) -> Message {
		Message {
			message_type: MessageType::GENERAL_LOG
			payload: log.to_json()
		}
	}
	fn create_command_message(&self, command: &Command) -> Message {
		Message {
			message_type: MessageType::COMMAND,
			payload: command.to_json()
		}
	}
	fn to_json(&self) -> String {
		payload: format!(r#"{}{{"messageType": "{}", "payload": "{}"}}{}"#,
			MESSAGE_TAG_OPEN,
			self.message_type,
			self.payload,
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
	data: String,
}
impl EventData<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"dataType": "{}", "data": {}"#,
				self.data_type, self.data)
	}
}

pub struct Event<'a> {
	event_type: &'a str,
	event_data: EventData<'a>,
}
impl Event<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"eventType": "{}", "eventData": "{}""#,
				&self.event_type, &self.event_data.to_json())
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
		// TODO: debug this logic and figure out what a uninitialized DateTime<Utc> looks like
		self.timestamp = self.timestamp ? self.timestamp : Utc::now();
		format!(r#"{{"severity": "{}", "area": "{}", "timestamp": {}, "message": "{}"}}"#,
				&self.severity, 
				&self.area,
				timestamp.to_rfc3339(),
				&self.message,
			)
	}
}
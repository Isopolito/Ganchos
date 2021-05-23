use serde::{Serialize};

#[derive(Serialize)]
pub struct RegexFilter {
	pub protocol: String,
	pub source_ip: String,
	pub dest_ip: String,
	pub payload: String,
}

#[derive(Serialize)]
pub struct Config {
	pub regex_filters: Vec<RegexFilter>,
}
impl Config {
	pub fn make_default() -> Config {
		Config {
			regex_filters: vec![],
		}
	}

	pub fn make_example() -> Config {
		Config {
			regex_filters: vec![RegexFilter {
				protocol: String::from("ip4"),
				source_ip: String::from("32.232.232.323"),
				dest_ip: String::from("192.*"),
				payload: String::from(""),
			}],
		}
	}
}
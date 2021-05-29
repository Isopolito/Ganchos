use serde::{Deserialize, Serialize};
use regex::Regex;

#[derive(Serialize, Deserialize)]
pub struct RegexFilter {
	pub source_ip: String,
	pub dest_ip: String,
	pub payload: String,

	#[serde(skip)]
	source_ip_re: Option<regex::Regex>,

	#[serde(skip)]
	dest_ip_re: Option<regex::Regex>,

	#[serde(skip)]
	payload_re: Option<regex::Regex>,
}
impl RegexFilter {
	pub fn new(source_ip: &str, dest_ip: &str, payload: &str) -> RegexFilter {
		RegexFilter {
			source_ip: String::from(source_ip),
			dest_ip: String::from(dest_ip),
			payload: String::from(dest_ip),
			source_ip_re: None,
			dest_ip_re: None,
			payload_re: None,
		}
	}
}

#[derive(Serialize, Deserialize)]
pub struct Filter {
	pub protocol: String,
	pub regex_filter: RegexFilter,
	pub port: u16,     // 0 to ignore
	pub min_size: u64, // 0 to ignore
	pub max_size: u64, // 0 to ignore
}
impl Filter {
	pub fn is_match(
			mut self,
			source_ip: String,
			source_port: u16,
			dest_ip: String,
			dest_port: u16,
			size: u64,
			payload: String,
	) -> bool {
		if (self.min_size > 0 && size > self.min_size) || (self.max_size > 0 && size < self.max_size) {
			return true;
		} else if dest_port == self.port || source_port == self.port {
			return true;
		}

		// Only create the regex's once per instance of a filter instead of every time is_match is called
		// source ip
		match self.regex_filter.source_ip_re {
			None => {
				// TODO: handle bad regex, this will panic
				let new_re = Regex::new(&self.regex_filter.source_ip).unwrap();
				self.regex_filter.source_ip_re = Some(new_re);
			},
			Some(_) => ()
		};
		if self.regex_filter.source_ip_re.unwrap().is_match(&source_ip) { return true; }

		// dest ip
		match self.regex_filter.dest_ip_re {
			None => {
				// TODO: handle bad regex, this will panic
				let new_re = Regex::new(&self.regex_filter.dest_ip).unwrap();
				self.regex_filter.dest_ip_re = Some(new_re);
			},
			Some(_) => ()
		};
		if self.regex_filter.dest_ip_re.unwrap().is_match(&dest_ip) { return true; }

		// payload
		match self.regex_filter.payload_re {
			None => {
				// TODO: handle bad regex, this will panic
				let new_re = Regex::new(&self.regex_filter.payload).unwrap();
				self.regex_filter.payload_re = Some(new_re);
			},
			Some(_) => ()
		};
		if self.regex_filter.payload_re.unwrap().is_match(&payload) { return true; }

		false
	}
}

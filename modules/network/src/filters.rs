use regex::Regex;
use serde::{Deserialize, Serialize};

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
			payload: String::from(payload),
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
		source_ip: &str,
		source_port: u16,
		dest_ip: &str,
		dest_port: u16,
		size: u64,
		payload: &str,
	) -> bool {

		// Factor this into a function
		if self.min_size > 0 && self.max_size > 0 && size > self.min_size && size < self.max_size {
			return true;
		} else if self.min_size > 0 && self.max_size == 0 && size > self.min_size {
			return true;
		} else if self.min_size == 0 && self.max_size > 0 && size < self.max_size {
			return true;
		}

		if (dest_port > 0 && dest_port == self.port)
			|| (source_port > 0 && source_port == self.port)
		{
			return true;
		}

		// Only create the regex's once per instance of a filter instead of every time is_match is called

		if !self.regex_filter.source_ip.is_empty() {
			match self.regex_filter.source_ip_re {
				None => {
					// TODO: handle bad regex, this will panic
					let new_re = Regex::new(&self.regex_filter.source_ip).unwrap();
					self.regex_filter.source_ip_re = Some(new_re);
				}
				Some(_) => (),
			};
			if self.regex_filter.source_ip_re.unwrap().is_match(&source_ip) {
				return true;
			}
		}

		if !self.regex_filter.dest_ip.is_empty() {
			match self.regex_filter.dest_ip_re {
				None => {
					// TODO: handle bad regex, this will panic
					let new_re = Regex::new(&self.regex_filter.dest_ip).unwrap();
					self.regex_filter.dest_ip_re = Some(new_re);
				}
				Some(_) => (),
			};
			if self.regex_filter.dest_ip_re.unwrap().is_match(&dest_ip) {
				return true;
			}
		}

		if !self.regex_filter.payload.is_empty() {
			match self.regex_filter.payload_re {
				None => {
					// TODO: handle bad regex, this will panic
					let new_re = Regex::new(&self.regex_filter.payload).unwrap();
					self.regex_filter.payload_re = Some(new_re);
				}
				Some(_) => (),
			};
			if self.regex_filter.payload_re.unwrap().is_match(&payload) {
				return true;
			}
		}

		false
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_source_port_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 69,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 69, "", 0, 0, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_source_port_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 70,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 69, "", 0, 0, "");

		assert_eq!(is_match, false);
	}

	#[test]
	fn test_dest_port_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 69,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 69, 0, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_dest_port_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 70,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 69, 0, "");

		assert_eq!(is_match, false);
	}

	#[test]
	fn test_min_size_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 5,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 0, 9, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_min_size_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 5,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 0, 2, "");

		assert_eq!(is_match, false);
	}

	#[test]
	fn test_max_size_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 10,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 0, 9, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_max_size_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 10,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 0, 12, "");

		assert_eq!(is_match, false);
	}
	#[test]
	fn test_min_max_size_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 5,
			max_size: 10,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 0, 7, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_min_max_size_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 5,
			max_size: 10,
			regex_filter: RegexFilter::new("", "", ""),
		};

		let is_match = filter.is_match("", 0, "", 0, 12, "");

		assert_eq!(is_match, false);
	}

	#[test]
	fn test_source_ip_regex_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("198.2.+", "", ""),
		};

		let is_match = filter.is_match("198.2.132.5", 0, "", 0, 12, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_source_ip_regex_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("198.3.*", "", ""),
		};

		let is_match = filter.is_match("198.2.132.5", 0, "", 0, 12, "");

		assert_eq!(is_match, false);
	}

	#[test]
	fn test_dest_ip_regex_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "198.2.+", ""),
		};

		let is_match = filter.is_match("", 0, "198.2.132.5", 0, 12, "");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_dest_ip_regex_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "198.3.*", ""),
		};

		let is_match = filter.is_match("", 0, "198.2.132.5", 0, 12, "");

		assert_eq!(is_match, false);
	}

	#[test]
	fn test_payload_regex_is_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ".+hello world$"),
		};

		let is_match = filter.is_match("", 0, "", 0, 0, "blah hello world");

		assert_eq!(is_match, true);
	}

	#[test]
	fn test_payload_regex_is_not_match() {
		let filter = Filter {
			protocol: String::from("ip4"),
			port: 0,
			min_size: 0,
			max_size: 0,
			regex_filter: RegexFilter::new("", "", ".*hello world$"),
		};

		let is_match = filter.is_match("", 0, "", 0, 0, "hello world blah");

		assert_eq!(is_match, false);
	}
}

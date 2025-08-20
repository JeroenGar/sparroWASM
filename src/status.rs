pub enum Status {
    Processing,
    Finished,
    Intermediate,
}

impl std::fmt::Display for Status {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Status::Processing => "processing",
            Status::Finished => "finished",
            Status::Intermediate => "intermediate",
        };
        write!(f, "{s}")
    }
}

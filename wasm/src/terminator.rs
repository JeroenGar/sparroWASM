use once_cell::sync::Lazy;
use sparrow::util::terminator::Terminator;
use std::sync::atomic::{AtomicBool, Ordering};
use wasm_bindgen::prelude::*;
use web_time::{Duration, Instant};

#[repr(align(4))]
pub struct AlignedAtomicBool(AtomicBool);

// Implement methods to access the inner AtomicBool
impl AlignedAtomicBool {
    pub const fn new(val: bool) -> Self {
        AlignedAtomicBool(AtomicBool::new(val))
    }

    pub fn load(&self, order: Ordering) -> bool {
        self.0.load(order)
    }

    pub fn store(&self, val: bool, order: Ordering) {
        self.0.store(val, order);
    }
}

static TERMINATE_FLAG: Lazy<AlignedAtomicBool> = Lazy::new(|| AlignedAtomicBool::new(false));

#[wasm_bindgen]
pub fn get_terminate_flag_offset() -> *const AlignedAtomicBool {
    // Return a raw pointer to the static atomic boolean.
    // The address will be an offset within the WASM linear memory.
    &*TERMINATE_FLAG as *const AlignedAtomicBool
}

pub struct WasmTerminator {
    pub timeout: Option<Instant>,
}

impl WasmTerminator {
    pub fn new() -> Self {
        Self { timeout: None }
    }

    pub fn terminate(&self) {
        TERMINATE_FLAG.store(true, Ordering::Relaxed);
    }
}

impl Terminator for WasmTerminator {
    fn kill(&self) -> bool {
        // ! Needs some more testing if this improves the speed (non atomic read)
        // let terminate = unsafe {
        //     let ptr = &*TERMINATE_FLAG as *const AlignedAtomicBool as *const bool;
        //     *ptr
        // };

        // self.timeout
        //     .map_or(false, |timeout| Instant::now() > timeout)
        //     || terminate

        self.timeout
            .map_or(false, |timeout| Instant::now() > timeout)
            || TERMINATE_FLAG.load(Ordering::Relaxed)
    }

    fn new_timeout(&mut self, timeout: Duration) {
        TERMINATE_FLAG.store(false, Ordering::Relaxed);
        self.timeout = Some(Instant::now() + timeout);
    }

    fn timeout_at(&self) -> Option<Instant> {
        self.timeout
    }
}

use crate::status::Status;

use jagua_rs::io::svg::s_layout_to_svg;
use jagua_rs::probs::spp::entities::{SPInstance, SPSolution};
use sparrow::consts::DRAW_OPTIONS;
use sparrow::util::listener::{ReportType, SolutionListener};
use wasm_bindgen::prelude::*;

pub struct WasmSvgExporter {
    svg_counter: usize,
}

impl WasmSvgExporter {
    pub fn new() -> Self {
        WasmSvgExporter { svg_counter: 0 }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = postMessage)]
    fn post_message_object_to_js(val: &JsValue);
}

impl SolutionListener for WasmSvgExporter {
    fn report(&mut self, report_type: ReportType, solution: &SPSolution, instance: &SPInstance) {
        let suffix = match report_type {
            ReportType::CmprFeas => "cmpr",
            ReportType::ExplInfeas => "expl_nf",
            ReportType::ExplFeas => "expl_f",
            ReportType::Final => "final",
            ReportType::ExplImproving => "expl_i",
        };
        let file_name = format!(
            "{}_{:.3}_{}",
            self.svg_counter,
            solution.strip_width(),
            suffix
        );

        let intermediate_svg = s_layout_to_svg(
            &solution.layout_snapshot,
            instance,
            DRAW_OPTIONS,
            &file_name.as_str(),
        );

        let js_obj = js_sys::Object::new();
        js_sys::Reflect::set(
            &js_obj,
            &JsValue::from_str("type"),
            &JsValue::from_str(&Status::Intermediate.to_string()),
        )
        .unwrap();

        js_sys::Reflect::set(
            &js_obj,
            &JsValue::from_str("result"),
            &JsValue::from_str(&intermediate_svg.to_string()),
        )
        .unwrap();

        post_message_object_to_js(&js_obj);
    }
}

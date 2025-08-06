use crate::enums::Status;

use crate::logger;
use crate::svg_exporter::WasmSvgExporter;
use crate::terminator::WasmTerminator;
use anyhow::{Context, Result};
use jagua_rs::io::import::Importer;
use jagua_rs::io::svg::s_layout_to_svg;
use jagua_rs::probs::spp::io::ext_repr::ExtSPInstance;
use log::{Level, info, log, warn};
use rand::SeedableRng;
use rand::prelude::SmallRng;
use serde_wasm_bindgen::from_value;
use sparrow::config::*;
use sparrow::consts::{
    DEFAULT_COMPRESS_TIME_RATIO, DEFAULT_EXPLORE_TIME_RATIO, DEFAULT_FAIL_DECAY_RATIO_CMPR,
    DEFAULT_MAX_CONSEQ_FAILS_EXPL, DRAW_OPTIONS,
};
use sparrow::optimizer::optimize;
use sparrow::util::listener::DummySolListener;
use std::time::Duration;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = postMessage)]
    fn post_message_object_to_js(val: &JsValue);
}

#[wasm_bindgen]
pub fn run_sparrow(
    json_input: JsValue,
    show_preview_svg: bool,
    time_limit: Option<u64>,
    seed: Option<u64>,
    use_early_termination: bool,
    n_workers: usize,
) -> Result<(), JsValue> {
    log!(Level::Info, "Started LBF optimization");

    let mut config = DEFAULT_SPARROW_CONFIG;

    let json_str: String = match from_value(json_input) {
        Ok(val) => val,
        Err(e) => {
            log!(Level::Error, "Error deserializing JSON input: {}", e);

            return Ok(());
        }
    };

    let (explore_dur, compress_dur) = match time_limit {
        Some(time_limit) => (
            Duration::from_secs(time_limit).mul_f32(DEFAULT_EXPLORE_TIME_RATIO),
            Duration::from_secs(time_limit).mul_f32(DEFAULT_COMPRESS_TIME_RATIO),
        ),
        None => {
            warn!("[MAIN] no time limit specified");
            (
                Duration::from_secs(600).mul_f32(DEFAULT_EXPLORE_TIME_RATIO),
                Duration::from_secs(600).mul_f32(DEFAULT_COMPRESS_TIME_RATIO),
            )
        }
    };

    info!(
        "[MAIN] Configured to explore for {}s and compress for {}s",
        explore_dur.as_secs(),
        compress_dur.as_secs()
    );

    config.expl_cfg.time_limit = explore_dur;
    config.cmpr_cfg.time_limit = compress_dur;

    config.expl_cfg.separator_config.n_workers = n_workers;
    config.cmpr_cfg.separator_config.n_workers = n_workers;

    if use_early_termination {
        config.expl_cfg.max_conseq_failed_attempts = Some(DEFAULT_MAX_CONSEQ_FAILS_EXPL);
        config.cmpr_cfg.shrink_decay =
            ShrinkDecayStrategy::FailureBased(DEFAULT_FAIL_DECAY_RATIO_CMPR);
        warn!("[MAIN] early termination enabled!");
    }

    let rng = match seed {
        Some(seed) => {
            info!("[MAIN] using seed: {}", seed);
            SmallRng::seed_from_u64(seed as u64)
        }
        None => {
            let seed = rand::random();
            warn!("[MAIN] no seed provided, using: {}", seed);
            SmallRng::seed_from_u64(seed)
        }
    };

    let ext_sp_instance: ExtSPInstance = serde_json::from_str(&json_str)
        .context("not a valid strip packing instance (ExtSPInstance)")
        .unwrap();

    let importer = Importer::new(
        config.cde_config,
        config.poly_simpl_tolerance,
        config.min_item_separation,
    );
    let instance = jagua_rs::probs::spp::io::import(&importer, &ext_sp_instance).unwrap();

    info!(
        "[MAIN] loaded instance {} with #{} items",
        ext_sp_instance.name,
        instance.total_item_qty()
    );

    let mut wasm_terminator = WasmTerminator::new();

    let sol;
    if show_preview_svg {
        sol = optimize(
            instance.clone(),
            rng,
            &mut WasmSvgExporter::new(),
            &mut wasm_terminator,
            &config.expl_cfg,
            &config.cmpr_cfg,
        );
    } else {
        sol = optimize(
            instance.clone(),
            rng,
            &mut DummySolListener,
            &mut wasm_terminator,
            &config.expl_cfg,
            &config.cmpr_cfg,
        );
    }

    logger::flush_logs();

    let svg_result =
        s_layout_to_svg(&sol.layout_snapshot, &instance, DRAW_OPTIONS, "SPARROW").to_string();

    let final_obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &final_obj,
        &JsValue::from_str("type"),
        &JsValue::from_str(&Status::Finished.to_string()),
    )
    .unwrap();
    js_sys::Reflect::set(
        &final_obj,
        &JsValue::from_str("result"),
        &JsValue::from_str(&svg_result),
    )
    .unwrap();
    post_message_object_to_js(&final_obj);

    Ok(())
}

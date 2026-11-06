# Manga colorization: adjustable settings catalog

Prepared November 5, 2026 for the future project dashboard. This is a reference and control specification, **not an implemented dashboard, training configuration, or claim that these features already work**. The training baseline has not been launched by this work.

## Parameters versus settings

**Learned parameters** are filter weights and biases: training updates them automatically. **Hyperparameters/settings** are choices we make, such as channels, layers, learning rate and loss. Data-processing, evaluation and execution settings also affect experiments, but are not all model hyperparameters.

The planned baseline is `1 → 16 → 16 → 3`, three 3×3 stride-one padded convolutions with ReLU after the first two. No U-Net, masks, boxes or classifier are required. `model.channels` controls convolution count: four channel entries imply three convolutions; do not create an independently conflicting layer-count setting. One output feature map comes from one output filter, whose kernel spans all its input channels (unless grouped).

The channel widths, kernels and ReLU are documented plans. L1 is the suggested first loss; Adam, learning rate, batch size, epochs, output activation, scaling and other new values below are **proposed defaults**, not earlier user approvals or tested best settings. Future entries require implementation before enabling their controls. No finite catalog covers every possible research architecture; this covers our baseline and named extensions.

Machine-readable companion: [manga-settings-catalog.json](manga-settings-catalog.json). Stable setting keys, types, proposed values, status, constraints and effects are included. `implemented: false` means this catalog alone does not implement a training control. Null means unset/inactive, not an arbitrary zero.


Full-run stopping policy: [validation early stopping, patience five, checkpoint selection and RunPod shutdown responsibilities](training-stopping-policy.md). This approved policy supersedes the historical disabled early-stopping proposal below; enforcement still requires implementation.

## First dashboard view

Initially expose: convolution count and hidden channels, kernel size, hidden/output activation, input size policy, batch size, loss, optimizer, learning rate and training duration. Show the source revision and split manifest alongside those controls. Put other controls under Advanced; disable future features until supported. Show loss and fixed validation examples alongside run settings.

Use per-layer editors for kernel/stride/dilation/group lists. The first channel count is derived from input representation; the last is derived from target representation. RGB baseline fixes them at 1 and 3. Changing color representation is a separate pipeline experiment.

## Architecture

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `model.family` | enum | `"tiny_cnn"` | tiny_cnn; later: unet, pretrained_encoder_decoder | Model family; changing family changes the experiment, not just one layer. |
| `model.channels` | integer[] | `[1, 16, 16, 3]` | [1,8,8,3]; [1,16,16,3]; [1,32,32,3] | Hidden widths control feature capacity, memory and compute. Input/output remain 1/3 for the RGB baseline. |
| `model.kernel_sizes` | integer[] | `[3, 3, 3]` | odd positive sizes, one per convolution | Spatial filter width/height. Larger filters see a wider neighborhood and cost more compute. |
| `model.strides` | integer[] | `[1, 1, 1]` | positive integers, one per convolution | Step size; values above 1 shrink feature maps and require an explicit reconstruction design. |
| `model.padding` | enum | `"same"` | same; valid; explicit per-layer values | Controls border handling and spatial dimensions. Same with stride 1 preserves height/width. |
| `model.padding_mode` | enum | `"zeros"` | zeros; reflect; replicate | How boundary pixels are extended; can change edge artifacts. |
| `model.dilations` | integer[] | `[1, 1, 1]` | positive integers, one per convolution | Spaces out filter samples, enlarging receptive field without adding filter weights. |
| `model.groups` | integer[] | `[1, 1, 1]` | divisors of both input and output channels | Grouped/depthwise connections reduce channel mixing; validate every layer. |
| `model.bias` | boolean | `true` | true; false | Adds one learned offset per output channel. |
| `model.hidden_activation` | enum | `"relu"` | relu; leaky_relu; gelu; silu; identity | Nonlinearity between convolutions; changes optimization and representable functions. |
| `model.negative_slope` | float | `0.01` | nonnegative; only with leaky_relu | Slope on negative inputs. |
| `model.output_activation` | enum | `"identity"` | identity; sigmoid; tanh | Output range: unrestricted, [0,1], or [-1,1]. Must agree with target scaling. |
| `model.normalization` | enum | `"none"` | none; batch; instance; group | Feature normalization changes optimization and sometimes color/contrast. Each type needs its own settings. |
| `model.norm_groups` | integer | `4` | positive divisor of hidden channels; only with group norm | Number of groups for group normalization. |
| `model.norm_epsilon` | float | `1e-05` | positive; only with normalization | Numerical stability constant. |
| `model.dropout` | float | `0.0` | 0 <= p < 1 | Randomly suppresses features during training; regularization, disabled for evaluation. |
| `model.initialization` | enum | `"framework_default"` | framework_default; kaiming; xavier | How learned weights start; appropriate choices depend on activation. |

## Data and preprocessing

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `data.revision` | string | `"a4f5be088cc1c47460f0bc07cafe8328e4ac8897"` | pinned source revision | Locks source identity for reproducible comparisons. |
| `data.split_manifest` | path | `null` | required before a real training run | Versioned train/validation/test membership. Do not change held-out sets between comparable runs. |
| `data.input_kind` | enum | `"desaturated_manga"` | desaturated_manga; original_bw | Different input tasks; retain separate evaluation tracks. |
| `data.color_space` | enum | `"rgb"` | rgb; later: lab_chroma | RGB baseline predicts three intensities. Lab chroma requires a different output/target pipeline. |
| `data.scaling` | enum | `"zero_one"` | zero_one; minus_one_one | Pixel numeric range; coordinate with output activation and metric reporting. |
| `data.spatial_mode` | enum | `"native"` | native; resize; crop; pad | Native preserves stored geometry; resizing trades detail for compute; crops trade context for detail. |
| `data.resize_hw` | integer[2] | `[256, 256]` | positive height/width; only with resize | Target resolution. Avoid unintended aspect distortion. |
| `data.resize_policy` | enum | `"fit_pad"` | fit_pad; stretch; cover_crop | Explicit aspect-ratio policy, active when resizing. |
| `data.interpolation` | enum | `"bilinear"` | nearest; bilinear; bicubic; area | Resampling rule; affects fine ink and text. Apply consistent paired geometry. |
| `data.antialias` | boolean | `true` | true; false; only for supported resize methods | Controls aliasing during downsampling. |
| `data.crop_hw` | integer[2] | `[256, 256]` | positive height/width; only with crop | Shared input/target crop size. |
| `data.crop_selection` | enum | `"random"` | random; center; grid | Training patch selection. Validation must use a fixed documented evaluation procedure. |
| `data.horizontal_flip` | float | `0.0` | probability 0–1; training only | Paired geometric augmentation; flips lettering too. |
| `data.rotation_degrees` | float | `0.0` | nonnegative maximum magnitude; training only | Paired rotation; document interpolation/fill and effects on text. |
| `data.title_sampling` | enum | `"natural"` | natural; uniform_titles; capped_titles | Natural sampling is dominated by Hunter X Hunter; alternatives rebalance training exposure. |
| `data.per_title_cap` | integer | `200` | positive; only with capped_titles | Limits training examples from each title; not a cap on evaluation sets. |
| `data.monochrome_target_policy` | enum | `"keep"` | keep; flag; exclude_from_training | How to handle colorless targets; freeze rules without tuning to test performance. |
| `data.shuffle` | boolean | `true` | true; false; training only | Changes order each epoch; keep input/target paired. |
| `data.batch_size` | integer | `2` | positive; memory dependent | Examples per forward/backward pass; affects memory and gradient noise. |
| `data.workers` | integer | `2` | nonnegative | Parallel loading workers; affects throughput and reproducibility. |
| `data.prefetch_batches` | integer | `2` | positive; only when worker loading supports it | Batches prepared ahead; trades RAM for throughput. |
| `data.pin_memory` | boolean | `true` | true; false; CUDA dependent | Can speed CPU-to-GPU transfers. |
| `data.drop_last` | boolean | `false` | true; false; training only | Whether to discard an incomplete final batch; never silently drop evaluation rows. |
| `data.cache` | enum | `"none"` | none; memory; local_disk | Loading performance setting; never duplicate the full dataset without checking space. |

## Loss

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `loss.kind` | enum | `"l1"` | l1; mse; smooth_l1 | L1 averages absolute RGB errors; MSE squares them; Smooth L1 combines regimes. Cross-entropy is not appropriate for this continuous RGB baseline. |
| `loss.reduction` | enum | `"mean"` | mean; sum | Mean keeps scale more comparable across image/batch sizes. Sum changes gradient scale with element count. |
| `loss.smooth_l1_beta` | float | `1.0` | positive; only with smooth_l1 | Transition threshold, interpreted in the chosen pixel scale. |
| `loss.channel_weights` | float[3] | `[1, 1, 1]` | nonnegative, not all zero | Relative RGB contributions; normalize weighted mean explicitly. |
| `loss.reconstruction_weight` | float | `1.0` | nonnegative | Weight of the pixel reconstruction term in any composite loss. |
| `loss.edge_weight` | float | `0.0` | nonnegative; later extension | Weight of a separately defined differentiable edge term. Needs exact operator and boundary rules. |
| `loss.mask_mode` | enum | `"none"` | none; later: preserve_region, color_region | Requires checked masks; specify whether mask weights loss, guides input, or composites output. |
| `loss.mask_weight` | float | `1.0` | nonnegative; only with a mask loss | Relative weight for selected regions; normalize by valid weighted pixel count. |
| `loss.perceptual_weight` | float | `0.0` | nonnegative; later extension | Requires a specified feature network, layers and preprocessing; adds compute. |
| `loss.adversarial_weight` | float | `0.0` | nonnegative; later extension | Requires discriminator and separate optimizer/update configuration; not a tiny-CNN requirement. |

## Optimization and stopping

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `optim.name` | enum | `"adam"` | adam; adamw; sgd | Rule used to update learned weights. |
| `optim.learning_rate` | float | `0.001` | positive; example sweep 0.0001, 0.0003, 0.001 | Step size; too high can destabilize learning, too low can slow it. |
| `optim.weight_decay` | float | `0.0` | nonnegative | Regularization; Adam L2 and AdamW decoupled decay have different meanings. |
| `optim.betas` | float[2] | `[0.9, 0.999]` | each in [0,1); Adam/AdamW only | Gradient and squared-gradient smoothing coefficients. |
| `optim.epsilon` | float | `1e-08` | positive; Adam/AdamW only | Optimizer numerical stability constant. |
| `optim.momentum` | float | `0.9` | [0,1); SGD only | Accumulates gradient direction across updates. |
| `optim.nesterov` | boolean | `false` | only with compatible SGD momentum settings | Alternative momentum update. |
| `optim.gradient_clip_norm` | optional_float | `null` | null or positive | Caps gradient norm; applies after unscaling mixed-precision gradients. |
| `optim.scheduler` | enum | `"none"` | none; step; cosine; reduce_on_plateau | Changes learning rate over training; needs a defined stepping unit. |
| `optim.scheduler_step_epochs` | integer | `5` | positive; step scheduler only | Epoch interval between scheduled reductions. |
| `optim.scheduler_factor` | float | `0.5` | 0 < factor < 1; step/plateau only | Multiplier for learning-rate reductions. |
| `optim.scheduler_patience` | integer | `3` | nonnegative; plateau only | Validation checks without improvement before reducing the learning rate. |
| `optim.min_learning_rate` | float | `1e-06` | nonnegative; scheduler dependent | Learning-rate lower bound. |
| `optim.warmup_steps` | integer | `0` | nonnegative | Gradually increases learning rate initially; optional. |
| `train.epochs` | integer | `10` | positive | Maximum passes over the selected training set; provisional run budget. |
| `train.max_steps` | optional_integer | `null` | null or positive | Optional update cap; stop at whichever epoch/step limit comes first. |
| `train.accumulation_steps` | integer | `1` | positive | Microbatches per optimizer update; effective batch is batch_size × accumulation_steps on one device. |
| `train.early_stopping` | boolean | `false` | true; false | Stops using validation performance, never test performance. |
| `train.early_stopping_patience` | integer | `5` | positive; early stopping only | Validation checks without sufficient improvement before stopping. |
| `train.early_stopping_min_delta` | float | `0.0` | nonnegative; early stopping only | Minimum validation improvement counted as progress. |

## Execution and reproducibility

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `runtime.device` | enum | `"auto"` | auto; cpu; cuda; mps | Available hardware selection; never starts a paid VM by itself. |
| `runtime.precision` | enum | `"fp32"` | fp32; bf16_amp; fp16_amp | Numeric compute precision; hardware support and stability differ. |
| `runtime.seed` | integer | `42` | nonnegative | Controls initialization/sampling randomness; seed alone does not guarantee exact reproducibility. |
| `runtime.deterministic` | boolean | `false` | true; false | Requests deterministic operations; may slow training or reject unsupported operations. |
| `runtime.compile` | boolean | `false` | true; false; backend dependent | Optional execution optimization with compilation overhead. |
| `runtime.max_minutes` | optional_float | `null` | null or positive; mandatory for budgeted cloud runs | Training time cap; stopping a process does not necessarily stop provider billing. |
| `runtime.max_cost_usd` | optional_float | `null` | null or nonnegative; explicit user authorization required | External spending cap; must be enforced by orchestration, not only the training loop. |
| `runtime.stop_pod_on_finish` | boolean | `false` | provider-specific; requires authorized lifecycle control | Cloud lifecycle policy; preserve persistent storage and confirm stopped state. |

## Evaluation, logging and inference

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `eval.every_epochs` | integer | `1` | positive | Validation frequency; determines scheduler/early-stopping observation frequency. |
| `eval.metrics` | string[] | `["mae", "mse"]` | mae; mse; psnr; later: ssim, edge/preservation metrics | Report explicit range, aggregation, clipping and definitions; metrics do not prove plausible canonical colors. |
| `eval.track` | enum | `"desaturated"` | desaturated; original_bw | Report the approved two evaluation tracks separately; original-input collection status is independently tracked. |
| `eval.spatial_policy` | enum | `"full_image"` | full_image; fixed_tiles | Keep evaluation geometry consistent across compared models. |
| `eval.clip_predictions` | boolean | `false` | true; false | Whether metrics use raw or clipped predictions; state this explicitly. Display clipping is separate. |
| `eval.checkpoint_metric` | enum | `"validation_mae"` | validation_mae; validation_mse; validation_loss | Select the best checkpoint using validation only; minimize these errors. |
| `logging.every_steps` | integer | `20` | positive | Log frequency; affects overhead, not model architecture. |
| `logging.preview_count` | integer | `6` | nonnegative | Number of fixed validation examples shown per check; never use test previews as a tuning dashboard. |
| `logging.save_every_epochs` | integer | `1` | positive | Checkpoint interval; save model, optimizer, scheduler, scaler, RNG and step/epoch state for full resumption. |
| `logging.run_name` | string | `"tiny-cnn-baseline"` | unique human-readable label | Identifies immutable experiment settings and result paths. |
| `logging.resume_from` | optional_path | `null` | null or a compatible checkpoint path | Resume exact training state; distinguish from loading weights for a new experiment. |
| `inference.tile_hw` | optional_integer[2] | `null` | null or positive dimensions | Optional tiled inference for memory; needs sufficient halo and an explicit stitching policy. |
| `inference.tile_halo` | integer | `3` | nonnegative; architecture dependent | For the baseline, 3-pixel context radius covers the 7×7 receptive field; recompute after architecture changes. |
| `inference.display_clip` | boolean | `true` | true; false | Clip final display RGB to valid range; does not change training targets or loss. |
| `inference.preserve_mask` | boolean | `false` | false; later true with a validated mask source | Optional compositing; preserve-region definitions must not conflict with intentionally colored lettering. |

## Later architecture experiments

| Setting key | Type | Planned/proposed value | Choices or constraints | What changes |
| --- | --- | --- | --- | --- |
| `future.skip_connections` | enum | `null` | none; residual; unet | Different graph connections; requires implementation and shape validation. |
| `future.downsampling` | enum | `null` | none; pooling; strided_conv | Reduces feature resolution and broadens context; requires matching decoder. |
| `future.upsampling` | enum | `null` | interpolation_conv; transposed_conv | Decoder reconstruction choice; output dimensions must match targets. |
| `future.backbone` | optional_string | `null` | specific pretrained encoder name/version | Record weight provenance, input adaptation and preprocessing; tags alone do not provide pretrained semantics. |
| `future.freeze_encoder` | optional_boolean | `null` | true; false; pretrained model only | Controls which weights receive updates; unfreezing may need a different learning rate. |
| `future.encoder_learning_rate` | optional_float | `null` | null or positive; pretrained encoder only | Allows slower fine-tuning of pretrained weights. |

## Derived values: display, do not independently edit

- Convolution count = length of channel list minus one. Baseline: **3**.
- Baseline parameter count, with bias: **2,915**. Each dense convolution has `out_channels × (in_channels × kernel_height × kernel_width + 1)` learned numbers. Grouped convolutions divide the input-channel factor by the group count.
- Output shape per convolution dimension: `floor((input + 2×padding − dilation×(kernel−1) − 1)/stride + 1)`. Trace each layer before launching a run.
- Baseline receptive field: **7×7**, with a 3-pixel radius. More hidden channels do not enlarge it. Layer depth, kernel, dilation, stride and graph connections can.
- Effective single-device batch = physical batch × gradient accumulation, with caveats for partial batches, gradient averaging and batch normalization.
- Show estimated memory/compute with assumptions; report measured throughput/latency after a run. Do not invent GPU cost or phone performance from parameter count alone.

## Validation rules and dependencies

1. Per-layer array lengths must match convolution count; all channel/kernel/stride/dilation counts must be positive integers. Group counts must divide both input and output widths. Odd kernels with stride one simplify same-size padding.
2. Final predicted image shape must equal target shape. The simple baseline has no upsampler: reject incompatible downsampling/valid-padding choices unless the target/reconstruction policy is explicitly implemented.
3. Sigmoid pairs naturally with [0,1] targets; tanh with [-1,1]. Identity is unconstrained and is a proposed starting choice. Do not clip predictions inside training loss just to make outputs look valid. Record any clipping used for metrics separately.
4. All geometric transforms must use the same coordinates for both images and applicable masks. Training augmentation is disabled for validation/test. Native-size batches require compatible shapes, padding or size grouping; verify actual decoded dimensions, not only preview metadata.
5. Smooth-L1 beta, SGD momentum, Adam betas and scheduler settings must appear only with the matching selection. Masks require a real mask source and a documented role; clamp valid-pixel denominators and handle empty masks explicitly.
6. L1/MSE are regression losses. Cross-entropy would require redesigning color prediction as categorical bins and making corresponding targets, not merely changing a dropdown.
7. Freeze source/split definitions, held-out evaluation protocol and selected fixed validation examples for comparable experiments. Retain the approved 878 Bleach-pair test reservation. Report original-input tests separately, and never automatically include a test set in tuning or parameter sweeps.
8. Apply model/data/optimizer changes to a **new run** with a saved immutable snapshot. Do not mutate a running experiment silently. UI-only preview settings can change live; scheduler-driven updates are part of the saved run definition.
9. Save code revision, exact source/split manifest, resolved settings, software versions, seed, checkpoint state and metric definitions with each run. Resume requires compatible architecture and optimizer state; architecture edits require a new run or explicit transfer procedure.
10. No dashboard control should automatically start paid compute, change access permissions, publish results or erase data. Record cost limits and provider stop policy separately; future orchestration must verify provider shutdown.

## Suggested experiment sequence

First check fitting 8–16 training pairs. Then establish a baseline with fixed validation data. Compare one major factor at a time: L1 vs MSE, 8/16/32 hidden channels, 3×3 vs 5×5 kernels, then a larger-context architecture. Record all settings; changing resolution, data quantity and architecture simultaneously makes attribution difficult. Changing settings requires training a model to observe quality effects; sliders alone cannot predict those effects reliably.

Supporting plans: [project overview](Project%20information%20-%20consolidated.md), [split and evaluation plan](Manga%20colorization%20-%20split%20proposal.md), [dataset audit](Manga%20colorization%20-%20initial%20dataset%20audit.md).

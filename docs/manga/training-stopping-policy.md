# Manga baseline: training stopping policy

Approved November 5, 2026. This policy describes full baseline training, separately from the small fitting diagnostic. Documenting it does not start a run or authorize additional compute spending.

## When to stop

- Evaluate the fixed Shadows House validation partition after every completed epoch, using pixel-weighted RGB MAE on [0,1] targets and raw, unclipped predictions.
- Save the checkpoint with the lowest validation MAE. Use that checkpoint for the final selected model, even if it precedes the last epoch.
- Enable early stopping with patience **5**: stop after five consecutive completed validation checks without meaningful improvement. Training loss alone must not decide when to stop.
- Freeze the minimum improvement threshold before starting. An absolute MAE decrease of **0.0001** is a proposed initial threshold, not a measured optimum or a previously approved value. Record the chosen threshold in the immutable run configuration.
- Stop at the first applicable epoch, optimizer-step, elapsed-time or approved spending limit. Ten epochs remains a proposed initial ceiling; it is not evidence of convergence.
- Abort on non-finite loss, gradients or validation predictions. Large finite loss increases require inspection; no arbitrary automatic divergence threshold has been chosen.
- Inspect the same fixed validation images for coloring quality. Keep Bleach final-test images and metrics out of stopping and tuning decisions. Original-B&W performance remains a separate evaluation track.

Training loss falling while validation error consistently rises suggests overfitting. Both flattening suggests diminishing returns. Neither establishes a universal target loss or guarantees visually satisfactory colorization.

## Exact early-stopping behavior to implement

Maintain two separate values: the lowest MAE for checkpoint selection, and a significant-improvement reference for patience. On the first valid validation check, initialize both and set the no-improvement counter to zero. Subsequently:

1. Save `best.pt` on every strict new lowest MAE, even if the gain is smaller than the patience threshold.
2. Reset patience only when `reference_mae - current_mae > min_delta`; then update the significant-improvement reference. Otherwise increment the counter.
3. Stop when the counter reaches five. Ties count as no improvement. An incomplete validation pass must not update patience or select a best checkpoint.
4. Persist the counter, significant-improvement reference and best MAE in resumable checkpoints. Resume must preserve these values rather than grant five fresh epochs.
5. Record the stop reason, completed epoch, optimizer step, elapsed time, best epoch and selected checkpoint. Stop reasons should distinguish early stopping, epoch/step/time caps and numerical failure.

## Where enforcement belongs

**The Python training loop** enforces validation-based early stopping, checkpoint selection, numerical checks and epoch/step/time caps. RunPod supplies the machine; it does not infer model convergence from the loss curve. Settings written only in Markdown or the reference catalog do not execute anything.

**A separate run supervisor/operator** must enforce the whole pod runtime and approved spending allowance, including deployment, audit, validation and shutdown time. A training command's timer alone does not cover all those stages. Compute budget accounting must use the verified rate and applicable charges, reserve shutdown time and handle training errors or hangs.

**Stopping the Python process does not stop the pod.** The supervisor/operator must explicitly stop the existing pod through RunPod and verify compute is stopped. Persistent storage charges are separate. Automatic shutdown requires a separately implemented and verified provider-control path; this document does not establish one or add credentials.

## Implementation status inspected November 5, 2026

The local `manga-baseline/tinycnn/run.py` already evaluates each epoch, saves `best.pt`, checks finite values, enforces epoch/step caps and checks elapsed time between operations. Validation also checks its deadline. These checks are cooperative and can be exceeded by a running operation; they are not a hard provider billing limit.

The inspected code **does not yet implement patience-based early stopping**, its resume state, automatic spending enforcement or automatic pod shutdown. Its current configuration has ten epochs, optional step limits and a command-supplied time cap. This is a local-source inspection, not proof of the current remote deployment. Implement and verify the missing controls before claiming this policy is enforced on a full run.

The [100-setting reference catalog](Manga%20colorization%20-%20settings%20catalog.md) and [JSON companion](manga-settings-catalog.json) retain historical proposed defaults, including early stopping disabled. This approved policy supersedes that disabled proposal for the first full training run; an executable run configuration must explicitly enable patience five after implementation. The JSON companion is a reference, not the executable run configuration.

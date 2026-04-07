from typing import Protocol


class PolicyEvaluator(Protocol):
    def evaluate(self, *args, **kwargs):  # pragma: no cover - Phase 2
        ...

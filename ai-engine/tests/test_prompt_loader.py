import pytest
from app.core.exceptions import (
    PromptTemplateNotFoundError,
    PromptVariableInterpolationError,
)
from app.core.prompt_loader import get_prompt_path, load_prompt


def test_prompt_file_discovery():
    path = get_prompt_path("recommendations")
    assert path.name == "prompt.txt"
    assert path.parent.name == "recommendations"
    assert path.is_file()


def test_load_prompt_successful_interpolation():
    prompt = load_prompt(
        "recommendations",
        requirement="Need a cybersecurity audit",
        providers_payload="[]",
    )
    assert "Need a cybersecurity audit" in prompt
    assert "[]" in prompt


def test_load_prompt_missing_template_raises_error():
    with pytest.raises(PromptTemplateNotFoundError):
        load_prompt("non_existent_feature_xyz")


def test_load_prompt_missing_variable_raises_error():
    with pytest.raises(PromptVariableInterpolationError):
        # recommendations prompt requires requirement and providers_payload
        load_prompt("recommendations", requirement="Only requirement provided")
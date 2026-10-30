import pytest
from app.prompts.loader import load_prompt, get_prompt_path
from app.core.exceptions import (
    PromptTemplateNotFoundError,
    PromptVariableInterpolationError,
)


def test_prompt_file_discovery():
    path = get_prompt_path("recommendation")
    assert path.name == "recommendation.txt"
    assert path.is_file()


def test_load_prompt_successful_interpolation():
    prompt = load_prompt(
        "recommendation",
        requirement="Need a cybersecurity audit",
        providers_payload="[]",
    )
    assert "Need a cybersecurity audit" in prompt
    assert "Available Service Providers:" in prompt
    assert "[]" in prompt


def test_load_prompt_missing_template_raises_error():
    with pytest.raises(PromptTemplateNotFoundError):
        load_prompt("non_existent_template_file_xyz")


def test_load_prompt_missing_variable_raises_error():
    with pytest.raises(PromptVariableInterpolationError):
        # recommendation.txt requires both requirement and providers_payload
        load_prompt("recommendation", requirement="Only requirement provided")
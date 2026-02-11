import React from "react";

export default function TaskEditForm({
    taskClicked,
    onFieldChange,
    onSave,
    isSaving,
    errorMessage
}) {

    const disabled = !taskClicked?.id;

    return (

        <div className="TaskEditForm">
            <form onSubmit={(e) => e.preventDefault()}>
                <input
                    name='title'
                    placeholder='New task'
                    value={taskClicked.title || ''}
                    onChange={onFieldChange}
                    disabled={disabled}
                />

                <textarea
                    name='description'
                    placeholder='Details...'
                    value={taskClicked.description || ''}
                    onChange={onFieldChange}
                    disabled={disabled}
                />
                <button type="button" onClick={onSave} disabled={disabled || isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                </button>
                {errorMessage && <p className="errorText">{errorMessage}</p>}
            </form>
        </div>

    );
}

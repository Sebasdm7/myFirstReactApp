import React from "react";

export default function TaskEditForm(props) {
    return (

        <div className="TaskEditForm">
            <form>
                <input
                    name='title'
                    placeholder='New task'
                    value={props.taskClicked.title || ''}
                />

                <textarea
                    name='description'
                    placeholder='Details...'
                    value={props.taskClicked.description || ''}
                />

            </form>
        </div>

    );
}

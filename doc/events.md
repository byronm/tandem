Client Events
===

The list of possible events can be accessed via Tandem.File.events. It is recommended to use this object instead of hard-coding the string names of events. Ex.

    file.on(Tandem.File.events.READY, callback)

file.on('file-error', function(args...)) - Called whenever an irrecoverable error occurs (such as authentication failure).

file.on('file-health', function(oldHealth, newHealth)) - oldHealth and newHealth can be healthy, warning, or error. These values are also accessible via Tandem.File.health

file.on('file-join', function(user)) - Called when a remote user joins. Only called per user, not session. If the same user joins twice, event is emitted only for the first session.

file.on('file-leave', function(user)) - Called when a remote user leaves. Only called per user, not session. If the same user leaves twice, event is emitted only for the last session.

file.on('file-ready', function()) - Called when connection, authentication, and document sync have all completed successfully. At this point the file is ready to send and recieve updates.

file.on('file-update', function(delta)) - Called when a remote user has updated the file.


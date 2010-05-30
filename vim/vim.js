/* Copyright (C) 2010  Caleb Case <calebcase@gmail.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */

function CVim() {
	function Debug(level) {
		this.level = level;
	}

	Debug.prototype = {
		NONE: 0,
		ERROR: 1,
		WARN: 2,
		INFO: 3,
		ALL: 4,

		error: function() {
			if (this.level >= this.ERROR) console.error.apply(console, arguments);
		},
		warn: function() {
			if (this.level >= this.WARN) console.warn.apply(console, arguments);
		},
		info: function() {
			if (this.level >= this.INFO) console.info.apply(console, arguments);
		},
	}

	function EventProcessor() {

		/* charCodes are used for keyPress events. */
		this.charCode2String = {
			0:	"Nul",
			8:	"BS",
			9:	"Tab",
			10:	"NL",
			12:	"FF",
			13:	"Enter",
			27:	"Esc",
			32:	"Space",
			60:	"lt",
			92:	"Bslash",
			124:	"Bar",
			127:	"Del",
		};

		/* keyCodes are used for keyDown events. */
		this.keyCode2String = {
			0:	"Nul",
			8:	"BS",
			9:	"Tab",
			13:	"Enter",
			27:	"Esc",
			32:	"Space",
			33:	"PageUp",
			34:	"PageDown",
			35:	"End",
			36:	"Home",
			37:	"Left",
			38:	"Up",
			39:	"Right",
			40:	"Down",
			45:	"Insert",
			46:	"Del",
			112:	"F1",
			113:	"F2",
			114:	"F3",
			115:	"F4",
			116:	"F5",
			117:	"F6",
			118:	"F7",
			119:	"F8",
			120:	"F9",
			121:	"F10",
			122:	"F11",
			123:	"F12",
		};

		/* Save off the 'this' variable so that the callbacks
		 * will have use of it later when envoked.
		 */
		var self = this;

		/* Keyboard event handlers */

		/* It is at this point that your brain will explode. Key
		 * processing in javascript is a nightmare. Between the
		 * different semantics of a keydown vs keypress event
		 * and the multitude of variables for the key itself
		 * (keyCode, charCode, which, keyIdentifier) incredible
		 * madness ensues. This must be some cruel joke on
		 * humanity.
		 */

		/* One variable for a keydown event, one for keypress.
		 * The idea here is that later we will prefer keypress
		 * event data over keydown data. We do this because
		 * printable characters like 'a' and 'B' produce both
		 * events (first a keydown, then a keypress), but in the
		 * case of 'B' the keydown event has the keyCode equal
		 * to the lowercase 'b' and keypress has the correct
		 * keyCode for 'B' (in other words, keypress events
		 * process the shift key, important for things like
		 * '+').
		 *
		 * These events are augmented with a count (i.e.,
		 * auto-repeat) and whether or not the shift was
		 * processed.
		 *
		 * Key down events are triggered for all keys, but key
		 * press is not. Key press events are triggered only for
		 * 'printable' keys.
		 */
		var keyDownEvent = undefined;
		var keyPressEvent = undefined;

		/* All events are saved off until it is clear that they
		 * will be mapped or not. When an a stack of events
		 * isn't mapped, then the saved events are replayed (and
		 * marked with ignore). As key up events are generated,
		 * the stack is popped to the last key down event
		 * (removing any keypress events that may have been
		 * triggered in between). In this way, the exact
		 * sequence of events should get reported when a series
		 * of events is not mapped, but only some of the key up
		 * events occur (i.e., if you hold down they shift key
		 * and press several letters the capital letters that
		 * are mapped will perform their action, unmapped ones
		 * will pass through to the document, and the initial
		 * shift will only be replayed once).
		 */
		var savedEvents = [];

		function last(type) {
			var last = savedEvents.length - 1;
			for (; last >= 0 && savedEvents[last].type != type; last--);
			debug.info("Last " + type + ": " + last, savedEvents[last], savedEvents);
			return last;
		}

		function replay() {
			for (var i = 0; i < savedEvents.length; i++) {
				var event = savedEvents[i];

				if (!event.ignore) {
					event.ignore = true;

					debug.info("Replaying: ", event);

					event.returnValue = true;
					event.target.dispatchEvent(event);
				}
			}
		}

		function trim(end) {
			if (end >= 0) {
				savedEvents = savedEvents.slice(0, end);
			}
			else {
				savedEvents = [];
			}
			debug.info("After trim: ", savedEvents);
		}

		function keydown(event) {
			if (event.ignore) return;

			debug.info("key down event: ", event);

			savedEvents.push(event);
			//event.returnValue = false; /* prevent event propagation */

			/* Convert repeated keys into keyup events (but ignore if
			 * a keypress event has already occurred).
			 */
			if (keyDownEvent &&
			    keyDownEvent.keyIdentifier == event.keyIdentifier &&
			    !keyPressEvent) {
				self.keyup(event);
			}

			/* Grab initial key event information.
			 * Multiple keydown events will be generated
			 * but only the last one is of any interest.
			 * For example 'ctrl + shift + a' will produce 3
			 * keydown events, one for 'ctrl', one for
			 * 'ctrl + shift', and lastly 'ctrl + shift + a'.
			 */
			keyDownEvent = event;
		}
		document.addEventListener("keydown", keydown, true);
		self.keydown = keydown;

		function keypress(event) {
			if (event.ignore) return;

			debug.info("key press event: ", event);

			savedEvents.push(event);
			event.returnValue = false; /* prevent event propagation */

			/* Convert repeated keys into keyup events. */
			if (keyPressEvent && keyPressEvent.keyIdentifier == event.keyIdentifier) {
				self.keyup(event, true);
			}

			/* A printable key was pressed. */
			keyPressEvent = event;

			/* Mark shifted flag (shift has already been used
			 * to modify the keycode before it makes it to this
			 * keypress handler). I would just set
			 * shiftKey = false,
			 * but it must be declared const because setting
			 * it has no effect.
			 */
			if (keyPressEvent.shiftKey) keyPressEvent.keyShifted = true;

			/* Mark controlled flag if charCode is less than
			 * 32 (non-printable characters). This is
			 * necessary to handle things like CTRL-[ which
			 * generates a charCode for Esc rather than [.
			 */
			if (keyPressEvent.charCode < 32) keyPressEvent.keyControlled = true;
		}
		document.addEventListener("keypress", keypress, true);
		self.keypress = keypress;

		function keyup(event, converted) {
			if (event.ignore) return;

			debug.info("key up event: ", event);

			if (!converted) {
				savedEvents.push(event);
				event.returnValue = false; /* prevent event propagation */
			}

			/* The final, for real, key event that we care about. */
			var keyEvent = undefined;

			if (keyPressEvent) {
				debug.info("key press event: " +
					   keyPressEvent.charCode + ":" +
					   keyPressEvent.keyCode + ":" +
					   keyPressEvent.keyIdentifier);
			}

			if (keyDownEvent) {
				debug.info("key down event: " +
					   keyDownEvent.charCode + ":" +
					   keyDownEvent.keyCode + ":" +
					   keyDownEvent.keyIdentifier);
			}

			/* We have a keyup event for an already
			 * processed event. Like key down, key up events
			 * are generated for all key events, so for
			 * 'ctrl + shift + a' three key up events are
			 * generated: 'ctrl + shift + a', 'ctrl +
			 * shift', and 'ctrl'. We are only interested in
			 * the first one so after we process it, the key
			 * events are unset and we ignore the others.
			 */

			/* Process keypress events over others. */
			if (keyPressEvent) {
				keyEvent = keyPressEvent;
			}
			/* Process a keydown event if available. */
			else if (keyDownEvent) {
				keyEvent = keyDownEvent;
			}
			/* Otherwise bail. */
			else return;

			debug.info("key event: ", keyEvent);

			/* Create key string */
			var eventString = "<";

			/* Process the meta eventString. If the key was
			 * already shifted as in the case of a key press
			 * event, then ignore the shift modifier.
			 */
			if (keyEvent.shiftKey && !keyEvent.keyShifted) eventString += "S-";
			if (keyEvent.altKey) eventString += "A-";
			if (keyEvent.ctrlKey && !keyEvent.keyControlled) eventString += "C-";

			/* Its not clear that this is ever set
			 * correctly. On my system pressing the meta key
			 * results in a keyCode == 0 event with
			 * metaKey == false.
			 */
			if (keyEvent.metaKey) eventString += "M-";

			/* Decide what the character string should be.
			 * If one isn't found, then ignore this key.
			 */
			var charString = "";

			if (keyEvent.charCode != 0) {
				/* Convert the charCode if possible. */
				if (self.charCode2String[keyEvent.charCode]) {
					charString += self.charCode2String[keyEvent.charCode];
				}
				else {
					charString += String.fromCharCode(keyEvent.charCode);
				}
			}
			else if (keyEvent.keyCode != 0) {
				/* Convert the keyCode if possible. */
				if (self.keyCode2String[keyEvent.keyCode]) {
					charString += self.keyCode2String[keyEvent.keyCode];
				}
				else if (keyEvent.keyIdentifier[0] == 'U') {
					charString += String.fromCharCode(keyEvent.keyCode).toLowerCase();
				}
			}

			/* Fair warning: charString could contain
			 * unprintable characters. For example, CTRL-\
			 * will produce a eventString that looks like "",
			 * but really is ['"', 28, '"'].
			 */
			var mapped = false;
			if (charString.length != 0) {
				eventString += charString;
				eventString += ">";

				keyEvent.eventString = eventString;

				debug.info("Mapping event: " + eventString, keyEvent);
				mapped = mode.map(keyEvent);
			}
			else debug.warn("Unable to convert key event to a string: ", keyEvent);

			if (!mapped) {
				replay();
			}

			/* Remove handled events. */
			trim(last("keydown"));

			/* Find the last press and down events. */
			keyPressEvent = undefined;
			keyDownEvent = undefined;

			for (var i = savedEvents.length - 1; i >= 0; i--) {
				if (keyPressEvent && keyDownEvent) break;
				switch (savedEvents[i].type) {
					case "keypress":
						keyPressEvent = savedEvents[i];
						break;
					case "keydown":
						keyDownEvent = savedEvents[i];
						break;
					default:
						debug.warn("Woah, this isn't supposed to be here: ", savedEvents[i]);
				}
			}

			debug.info("After replay: ", savedEvents, keyPressEvent, keyDownEvent);
		}
		document.addEventListener("keyup", keyup, true);
		self.keyup = keyup;

		/* Mouse event handlers */

		/* If you thought the madness would stop with key events
		 * you're disappointment is likely only be surpassed by
		 * my despair. While it may seem to make sense to equate
		 * keydown, keypress, and keyup with mousedown, click,
		 * mouseup it simply isn't to be. Some events are
		 * wrapped (as in 'down', 'event', 'up') while others
		 * are ordered (as in 'down', 'up', 'event'). As a
		 * special kind of madness, right click triggers the
		 * contextmenu event (which proves to be the case that
		 * breaks the rule with event ordering).
		 *
		 * 'click':		mousedown -> mouseup -> click
		 * 'double click':	mousedown -> mouseup -> click -> mousedown -> mouseup -> click(2)
		 * 'right click:	mousedown -> contextmenu
		 */

		function mousedown(event) {
			if (event.ignore) return;

			debug.info("mousedown event: ", event);

			savedEvents.push(event);
			//event.returnValue = false; /* prevent event propagation */
		}
		document.addEventListener("mousedown", mousedown, true);

		function contextmenu(event) { /* aka, right click... */
			if (event.ignore) return;

			debug.info("contextmenu event: ", event);

			savedEvents.push(event);
			event.returnValue = false; /* prevent event propagation */

			var eventString = "<";

			switch (event.detail) {
				case 2:
					eventString += "2-";
					break;
				case 3:
					eventString += "3-";
					break;
				case 4:
					eventString += "4-";
					break;
			}

			eventString += "RightMouse>";

			var mapped = false;
			event.eventString = eventString;
			mapped = mode.map(event);

			if (!mapped) {
				replay();
			}

			trim(last("mousedown"));
		}
		document.addEventListener("contextmenu", contextmenu, true);

		function mouseup(event) {
			if (event.ignore) return;

			debug.info("mouseup event: ", event);

			savedEvents.push(event);
			event.returnValue = false; /* prevent event propagation */

			switch (event.button) {
				case 0:
					event.eventString = "<LeftRelease>";
					break;
				case 1:
					event.eventString = "<MiddleRelease>";
					break;
				case 2:
					event.eventString = "<RightRelease>";
					break;
				default:
					debug.warn("Unknown button type: " + event.button);
			}

			var mapped = false;
			if (event.eventString) {
				mapped = mode.map(event);
			}

			if (!mapped) {
				replay();
			}

			trim(last("mousedown"));
		}
		document.addEventListener("mouseup", mouseup, true);

		function click(event) {
			if (event.ignore) return;

			debug.info("click event: ", event);

			savedEvents.push(event);
			event.returnValue = false; /* prevent event propagation */

			var eventString = "<";

			switch (event.detail) {
				case 2:
					eventString += "2-";
					break;
				case 3:
					eventString += "3-";
					break;
				case 4:
					eventString += "4-";
					break;
			}

			switch (event.button) {
				case 0:
					eventString += "LeftMouse";
					break;
				case 1:
					eventString += "MiddleMouse";
					break;
				case 2:
					eventString += "RightMouse";
					break;
				default:
					debug.warn("Unknown button type: " + event.button);
					eventString = undefined;
			}

			var mapped = false;
			if (eventString) {
				eventString += ">";
				event.eventString = eventString;
				mapped = mode.map(event);
			}

			if (!mapped) {
				replay();
			}

			trim(last("click"));
		}
		document.addEventListener("click", click, true);
	}

	EventProcessor.prototype = {};

	function Mapping() {
		this.states = {
			START: "start",
			ACCEPT: "accept",
			REJECT: "reject",
		};

		this.state = this.states.START;

		this.action = function() {
			mode.reset();
		};
	}

	Mapping.prototype = {
		reset: function() {
			this.state = this.states.START;
		},

		next: function(eventString) {
			this.state = this.states.REJECT;
			return this.state;
		},
	};

	function SingleKeyMapping(eventString, action) {
		Mapping.apply(this, arguments);

		this.eventString = eventString;
		this.action = function() {
			mode.reset();
			action();
		}
	}

	SingleKeyMapping.prototype = new Mapping();
	SingleKeyMapping.prototype.next = function(keyEvent) {
		if (keyEvent.eventString == this.eventString) {
			this.state = this.states.ACCEPT;
		}
		else {
			this.state = this.states.REJECT;
		}
		return this.state;
	};

	function Mapper() {
		this.mappings = new Array();
		this.active = new Array();
	}

	Mapper.prototype = {
		init: function () { this.reset() },
		fini: function () {},

		action: function() {
			this.reset();
		},

		reset: function() {
			debug.info("Resetting");
			this.active = this.mappings.concat([]);

			for (var i = 0; i < this.active.length; i++) {
				this.active[i].reset();
			}

			debug.info("Mappings[" + this.mappings.length + "]", this.mappings);
			debug.info("Active[" + this.active.length + "]", this.active);
		},

		map: function(keyEvent) {
			/* True if a mapping processed the event. */
			var processed = false;

			/* The mapping that accepted. */
			var accepted = undefined;

			/* New set of active mappings. */
			var newactive = new Array();

			/* For each mapping. */
			debug.info("Total active mappings: " + this.active.length);

			for (var i = 0; i < this.active.length; i++) {
				var mapping = this.active[i];

				/* Update state with key. */
				var state = mapping.next(keyEvent);
				debug.info("State for mapping [" + i + "] is " + state, mapping);

				/* If state is now Accept, then */
				if (state == mapping.states.ACCEPT) {
					debug.info("Accepting, running: ", mapping.action);

					/* Save mapping to run and stop looping. */
					processed = true;
					accepted = mapping;
					break;
				}
				/* If state is something other than Reject, then */
				else if (state != mapping.states.REJECT) {
					/* Add to active mappings. */
					processed = true;
					newactive.push(mapping);
				}
			}

			/* If no mapping accepted and there aren't any more
			 * mappings to check (newactive is empty), then set
			 * accepted to ourselves (so that the default action
			 * will get called.
			 */
			if (!accepted && newactive.length == 0) {
				debug.info("Setting default action...");

				accepted = this;
			}

			/* Run the action if someone accepted. */
			if (accepted) {
				debug.info("Action found: ", accepted.action);

				accepted.action();
			}
			/* Otherwise replace the active mappings with our new one. */
			else {
				this.active = newactive;
			}

			return processed;
		},
	};

	function NormalMapper() {
		Mapper.apply(this, arguments);

		/* N is an environment variable for Normal Mode that
		 * keeps track of an optional count modifier. It
		 * defaults to 1 and gets updated by the count mapping.
		 */
		var N = new String("1");

		this.N = function(myN) {
			if (myN) N = myN;
			return N;
		};

		/* The single key mapping that resets N. */
		function NormalSingleKeyMapping(eventString, action, repeated) {
			SingleKeyMapping.apply(this, arguments);

			this.action = function() {
				if (repeated) {
					var count = parseInt(N);
					debug.info("count: " + count);
					for (var i = 0; i < count; i++) {
						action();
					}
				}
				else action();
				mode.reset();
			}
		}

		NormalSingleKeyMapping.prototype = new SingleKeyMapping();

		/* Mappings */

		/* Count mapping updates N when an optional count is
		 * invoked and then chains the mapping for the rest of
		 * the keyStack.
		 */
		var count = new Mapping();
		count.states.n = "collecting numbers";
		count.isNum = function(eventString) {
			if (eventString.length == 3) {
				var charCode = eventString.charCodeAt(1);
				if (charCode > 47 && charCode < 58) {
					return true;
				}
			}
			return false;
		};
		count.next = function(keyEvent) {
			switch (this.state) {
				case count.states.START:
					debug.info("Count.states.START: " + keyEvent);
					this.state = this.states.REJECT;
					if (this.isNum(keyEvent.eventString)) {
						if (keyEvent.eventString[1] != "0") {
							N = new String(keyEvent.eventString[1]);
							this.state = this.states.n;
						}
					}
					break;
				case count.states.n:
					if (this.isNum(keyEvent.eventString)) {
						N += keyEvent.eventString[1];
						debug.info("N: " + N);
					}
					else {
						this.state = this.states.ACCEPT;
						this.keyEvent = keyEvent;
					}
					break;
				default:
					this.state = this.states.REJECT;
			}
			return this.state;
		};
		count.action = function() {
			debug.info("N: " + N);
			debug.info(count);

			/* Save off the eventString, its about to get
			 * erased with the reset.
			 */
			var keyEvent = count.keyEvent;

			/* Reset the mode so that the unprocessed key
			 * event can get handled. This is only a partial
			 * reset so that N is preserved.
			 */
			mode.reset(true);
			mode.map(keyEvent);
		};
		count.reset = function() {
			count.state = count.states.START;
			count.keyEvent = undefined;
		};

		this.mappings.push(count);

		this.mappings.push(
			new NormalSingleKeyMapping("<Esc>",
				function() {},
				true
			)
		);

		this.mappings.push(
			new NormalSingleKeyMapping("<h>",
				function() {
					window.scrollBy(-40, 0);
				},
				true
			)
		);

		this.mappings.push(
			new NormalSingleKeyMapping("<j>",
				function() {
					window.scrollBy(0, 40);
				},
				true
			)
		);

		this.mappings.push(
			new NormalSingleKeyMapping("<k>",
				function() {
					window.scrollBy(0, -40);
				},
				true
			)
		);

		this.mappings.push(
			new NormalSingleKeyMapping("<l>",
				function() {
					window.scrollBy(40, 0);
				},
				true
			)
		);

		var gg = new Mapping();
		gg.states.g = "first g";
		gg.next = function(keyEvent) {
			switch (this.state) {
				case this.states.START:
					switch (keyEvent.eventString) {
						/* g */
						case "<g>":
							this.state = this.states.g;
							break;
						default:
							this.state = this.states.REJECT;
					};
					break;
				case this.states.g:
					switch (keyEvent.eventString) {
						/* Borrowed with love from the Vim help manual.
						/* g CTRL-A	   only when compiled with MEM_PROFILE
						/* 		   defined: dump a memory profile
						/* g CTRL-G	   show information about current cursor
						/* 		   position
						/* g CTRL-H	   start Select block mode
						/* g CTRL-]	   |:tjump| to the tag under the cursor
						/* g#		1  like "#", but without using "\<" and "\>"
						/* g$		1  when 'wrap' off go to rightmost character of
						/* 		   the current line that is on the screen;
						/* 		   when 'wrap' on go to the rightmost character
						/* 		   of the current screen line
						/* g&		2  repeat last ":s" on all lines
						/* g'{mark}	1  like |'| but without changing the jumplist
						/* g`{mark}	1  like |`| but without changing the jumplist
						/* g*		1  like "*", but without using "\<" and "\>"
						/* g0		1  when 'wrap' off go to leftmost character of
						/* 		   the current line that is on the screen;
						/* 		   when 'wrap' on go to the leftmost character
						/* 		   of the current screen line
						/* g8		   print hex value of bytes used in UTF-8
						/* 		   character under the cursor
						/* g<		   display previous command output
						/* g?		2  Rot13 encoding operator
						/* g??		2  Rot13 encode current line
						/* g?g?		2  Rot13 encode current line
						/* gD		1  go to definition of word under the cursor
						/* 		   in current file
						/* gE		1  go backwards to the end of the previous
						/* 		   WORD
						/* gH		   start Select line mode
						/* gI		2  like "I", but always start in column 1
						/* gJ		2  join lines without inserting space
						/* ["x]gP		2  put the text [from register x] before the
						/* 		   cursor N times, leave the cursor after it
						/* gR		2  enter Virtual Replace mode
						/* gU{motion}	2  make Nmove text uppercase
						/* gV		   don't reselect the previous Visual area
						/* 		   when executing a mapping or menu in Select
						/* 		   mode
						/* g]		   :tselect on the tag under the cursor
						/* g^		1  when 'wrap' off go to leftmost non-white
						/* 		   character of the current line that is on
						/* 		   the screen; when 'wrap' on go to the
						/* 		   leftmost non-white character of the current
						/* 		   screen line
						/* ga		   print ascii value of character under the
						/* 		   cursor
						/* gd		1  go to definition of word under the cursor
						/* 		   in current function
						/* ge		1  go backwards to the end of the previous
						/* 		   word
						/* gf		   start editing the file whose name is under
						/* 		   the cursor
						/* gF		   start editing the file whose name is under
						/* 		   the cursor and jump to the line number
						/* 		   following the filename.
						/* gg		1  cursor to line N, default first line */
						case "<g>":
							this.state = this.states.ACCEPT;
							this.action = function() {
								mode.reset();
								window.scrollTo(0,0);
							};
							break;
						/* gh		   start Select mode
						/* gi		2  like "i", but first move to the |'^| mark
						/* gj		1  like "j", but when 'wrap' on go N screen
						/* 		   lines down
						/* gk		1  like "k", but when 'wrap' on go N screen
						/* 		   lines up
						/* gm		1  go to character at middle of the screenline
						/* go		1  cursor to byte N in the buffer
						/* ["x]gp		2  put the text [from register x] after the
						/* 		   cursor N times, leave the cursor after it
						/* gq{motion}	2  format Nmove text
						/* gr{char}	2  virtual replace N chars with {char}
						/* gs		   go to sleep for N seconds (default 1)
						/* gu{motion}	2  make Nmove text lowercase
						/* gv		   reselect the previous Visual area
						/* gw{motion}	2  format Nmove text and keep cursor
						/* gx		   execute application for file name under the
						/* 		   cursor (only with |netrw| plugin)
						/* g@{motion}	   call 'operatorfunc'
						/* g~{motion}	2  swap case for Nmove text
						/* g<Down>		1  same as "gj"
						/* g<End>		1  same as "g$"
						/* g<Home>		1  same as "g0"
						/* g<LeftMouse>	   same as <C-LeftMouse>
						/* g<MiddleMouse>	   same as <C-MiddleMouse>
						/* g<RightMouse>	   same as <C-RightMouse>
						/* g<Up>		1  same as "gk" */
						default:
							this.state = this.states.REJECT;
					};
					break;
			};
			return this.state;
		};
		this.mappings.push(gg);

		this.mappings.push(
			new NormalSingleKeyMapping("<G>",
				function() {
					window.scrollTo(0,document.body.scrollHeight);
				}
			)
		);

		this.mappings.push(
			new NormalSingleKeyMapping("<i>",
				function() {
					mode.fini();
					mode = modes.insert;
					mode.init();
				}
			)
		);

		this.mappings.push(
			new NormalSingleKeyMapping("<f>",
				function() {
					mode.fini();
					mode = modes.hints;
					mode.init();
				}
			)
		);

		this.reset();
	}

	NormalMapper.prototype = new Mapper();
	NormalMapper.prototype.reset = function(partial) {
		Mapper.prototype.reset.call(this);

		if (!partial) {
			debug.info("Resetting N: " + this.N());
			this.N(new String("1"));
		}
	};

	function InsertMapper() {
		Mapper.apply(this, arguments);

		this.mappings.push(
			new SingleKeyMapping("<Esc>",
				function() {
					mode.fini();
					mode = modes.normal;
					mode.init();
				}
			)
		);

		this.reset();
	}

	InsertMapper.prototype = new Mapper();

	function HintsMapper() {
		Mapper.apply(this, arguments);

		var digits = 0;

		this.digits = function(n) {
			if (n) digits = n;
			return digits;
		};

		/* Symbols from home row. */
		var symbols = "asdfjklASDFJKL";

		this.symbols = function(s) {
			if (s) symbols = s;
			return symbols;
		};

		this.mappings.push(
			new SingleKeyMapping("<Esc>",
				function() {
					mode.fini();
					mode = modes.normal;
					mode.init();
				}
			)
		);

		var hint = new Mapping();
		hint.states.n = "waiting for more digits";
		hint.next = function(event) {
			switch (this.state) {
				case this.states.START:
				case this.states.n:
					if (event.eventString.length == 3 &&
					    symbols.indexOf(event.eventString[1]) >= 0) {
						this.digits.push(event.eventString[1]);
						this.state = this.states.n;

						if (this.digits.length == digits) {
							this.state = this.states.ACCEPT;
						}
					}
					else this.state = this.states.REJECT;
					break;
				default:
					this.state = this.states.REJECT;
			}
			return this.state;
		};
		hint.action = function() {
			debug.info("Follow the white rabbit.");
			var hintClass = "CVimHint_" + this.digits.join("");

			var results = document.evaluate(
				"//div[contains(@class, '" + hintClass + "')]",
				document.body,
				document.createNSResolver(document),
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null);
			var node = results.snapshotItem(0);
			debug.info("href: " + node.parentNode.getAttribute("href"));
			window.location.href = node.parentNode.getAttribute("href");
		}
		hint.reset = function() {
			this.state = this.states.START;
			this.digits = [];
		};

		this.mappings.push(hint);

		this.reset();
	}

	HintsMapper.prototype = new Mapper();
	HintsMapper.prototype.init = function() {
		/* Select followable items. */
		var results = document.evaluate(
			"//a",
			document.body,
			document.createNSResolver(document),
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null);
		debug.info("Followables found: " + results.snapshotLength);

		/* Symbols from home row. */
		var symbols = this.symbols();

		/* Calculate digits required. */
		var digits = Math.ceil(Math.log(results.snapshotLength) / Math.log(symbols.length));
		debug.info("Digits required: " + digits);
		this.digits(digits);

		function convert(n) {
			var c = new Array(digits);
			for (var i = 0; i < digits; i++) { c[i] = "a"; }

			var i = digits - 1;
			while (n != 0) {
				var r = n % symbols.length;
				c[i] = symbols[r];
				n = Math.floor(n / symbols.length);
				i--;
			}
			return c.join("");
		}

		var hints = [];
		for (var i = 0; i < results.snapshotLength; i++) {
			var hintString = convert(i);

			var node = results.snapshotItem(i);
			//node.className += " CVimHint_" + hintString;

			var hint = document.createElement("div");
			hint.className = "CVimHint CVimHint_" + hintString;

			for (var j = 0; j < hintString.length; j++) {
				var hintChar = document.createElement("span");
				hintChar.className = "CVimHintChar";
				hintChar.innerHTML = hintString[j];
				hint.appendChild(hintChar);
			}

			var position = node.getClientRects()[0];
			debug.info("Pos: ", position);
			if (position) {
				hint.style.position = "absolute";
				hint.style.left = position.left + window.scrollX;
				hint.style.top = position.top + window.scrollY;
				hints.push([node, hint]);
			}
		}

		for (var i = 0; i < hints.length; i++) {
			hints[i][0].appendChild(hints[i][1]);
		}
	};
	HintsMapper.prototype.fini = function() {
		var results = document.evaluate(
			"//div[contains(@class, 'CVimHint')]",
			document.body,
			document.createNSResolver(document),
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null);
		debug.info("Cleaning up: " + results.snapshotLength);
		for (var i = 0; i < results.snapshotLength; i++) {
			var node = results.snapshotItem(i);
			node.parentNode.removeChild(node);
		}
	};

	/* Environment */

	var debug = new Debug(Debug.prototype.ALL);

	var modes = {
		normal: new NormalMapper(),
		insert: new InsertMapper(),
		hints: new HintsMapper(),
	};

	var mode = modes.normal;

	var eventProcessor = new EventProcessor();
};


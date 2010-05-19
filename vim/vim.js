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

	function KeyStack() {
		this.stack = new Array();
	}

	KeyStack.prototype = {
		length: function() {
			return this.stack.length;
		},

		peek: function() {
			debug.info("Peek Key: ", this.stack[0]);
			return this.stack[0];
		},

		push: function(keyString) {
			debug.info("Push Key Event: " + keyString);

			this.stack.unshift(keyString);
			debug.info("New Stack: ", this.stack);

			mode.map(this);
		},

		reset: function() {
			debug.info("Reset");

			this.stack = new Array();
		},
	}

	function KeyProcessor() {

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

		function keydown(event) {
			debug.info("key down event: ", event);

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
		};
		document.addEventListener("keydown", keydown, true);

		function keypress(event) {
			debug.info("key press event: ", event);

			/* Convert repeated keys into keyup events. */
			if (keyPressEvent && keyPressEvent.keyIdentifier == event.keyIdentifier) {
				self.keyup(event);
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
		};
		document.addEventListener("keypress", keypress, true);

		function keyup(event) {
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

			/* We have a keyup event for an already
			 * processed event. Like key down, key up events
			 * are generated for all key events, so for
			 * 'ctrl + shift + a' three key up events are
			 * generated: 'ctrl + shift + a', 'ctrl +
			 * shift', and 'ctrl'. We are only interested in
			 * the first one so after we process it, the key
			 * events are unset and we ignore the others.
			 */

			/* Create key string */
			var keyString = "<";

			/* Process the meta keyString. If the key was
			 * already shifted as in the case of a key press
			 * event, then ignore the shift modifier.
			 */
			if (keyEvent.shiftKey && !keyEvent.keyShifted) keyString += "S-";
			if (keyEvent.altKey) keyString += "A-";
			if (keyEvent.ctrlKey && !keyEvent.keyControlled) keyString += "C-";

			/* Its not clear that this is ever set
			 * correctly. On my system pressing the meta key
			 * results in a keyCode == 0 event with
			 * metaKey == false.
			 */
			if (keyEvent.metaKey) keyString += "M-";

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
			 * will produce a keyString that looks like "",
			 * but really is ['"', 28, '"'].
			 */
			if (charString.length != 0) {
				keyString += charString;

				keyString += ">";

				/* Add key to stack. */
				keyStack.push(keyString);
			}
			else debug.warn("Unable to convert key event to a string: ", keyEvent);

			/* Reset the events, key was processed. */
			keyPressEvent = undefined;
			keyDownEvent = undefined;
		};
		document.addEventListener("keyup", keyup, true);
		self.keyup = keyup;
	}

	KeyProcessor.prototype = { };

	function Mapper() {
		this.mappings = new Array();
		this.active = new Array();
	}

	Mapper.prototype = {
		action: function() {
			keyStack.reset();
			mode.reset();
		},

		reset: function() {
			debug.info("Resetting");
			this.active = this.mappings.concat([]);

			var max = this.active.length;
			for (var i = 0; i < max; i++) {
				this.active[i].reset();
			}

			debug.info("Mappings[" + this.mappings.length + "]", this.mappings);
			debug.info("Active[" + this.active.length + "]", this.active);
		},

		map: function(keyStack) {
			debug.info("Mapping stack");

			var action = undefined;

			/* New set of active mappings. */
			var newactive = new Array();

			/* Peek last key. */
			var last = keyStack.peek();
			debug.info("Last key was: " + last);

			/* For each mapping. */
			var max = this.active.length;
			debug.info("Total active mappings: " + max);

			for (var i = 0; i < max; i++) {
				var mapping = this.active[i];

				/* Update state with key. */
				var state = mapping.next(last);
				debug.info("State for mapping [" + i + "] is " + state, mapping);

				/* If state is now Accept, then */
				if (state == mapping.states.ACCEPT) {
					debug.info("Accepting, running: ", mapping.action);

					/* Save action to run and stop looping. */
					action = mapping.action;
					break;
				}
				/* Else if state is now Reject, then */
				else if (state != mapping.states.REJECT) {
					/* Add to active mappings. */
					newactive.push(mapping);
				}
			}

			/* If the keyStack isn't empty and
			 * there aren't any other active mappers,
			 * then set action to default.
			 */
			if (!action &&
			    keyStack.length() != 0 &&
			    newactive.length == 0) {
				debug.info("Setting default action...");

				action = this.action;
			}

			/* If an action was found, then run it and reset. */
			if (action) {
				debug.info("Action found: ", action);

				action();
			}
			/* Otherwise replace the active with our new one. */
			else {
				this.active = newactive;
			}
		},
	};

	function Mapping() {
		this.states = {
			START: "start",
			ACCEPT: "accept",
			REJECT: "reject",
		};

		this.state = this.states.START;

		this.action = function() {
			keyStack.reset();
			this.reset();
		};
	}

	Mapping.prototype = {
		reset: function() {
			this.state = this.states.START;
		},

		next: function(keyString) {
			this.state = this.states.REJECT;
			return this.state;
		},
	};

	function NormalMapper() {
		Mapper.apply(this, arguments);

		/* N is an environment variable for Normal Mode that
		 * keeps track of an optional count modifier. It
		 * defaults to 1 and gets updated by the count mapping.
		 * Normal mappings should reset N to "1".
		 */
		var N = new String("1");

		this.N = function(myN) {
			if (myN) N = myN;
			return N;
		};

		/* The single key mapping that resets N. */
		function NormalSingleKeyMapping(keyString, action, repeated) {
			SingleKeyMapping.apply(this, arguments);

			this.action = function() {
				keyStack.reset();

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
		count.isNum = function(keyString) {
			if (keyString.length == 3) {
				var charCode = keyString.charCodeAt(1);
				if (charCode > 47 && charCode < 58) {
					return true;
				}
			}
			return false;
		};
		count.next = function(keyString) {
			switch (this.state) {
				case count.states.START:
					debug.info("Count.states.START: " + keyString);
					this.state = this.states.REJECT;
					if (this.isNum(keyString)) {
						if (keyString[1] != "0") {
							N = new String(keyString[1]);
							this.state = this.states.n;
						}
					}
					break;
				case count.states.n:
					if (this.isNum(keyString)) {
						N += keyString[1];
						debug.info("N: " + N);
					}
					else {
						this.state = this.states.ACCEPT;
						this.keyString = keyString;
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

			/* Save off the keyString, its about to get
			 * erased with the reset.
			 */
			var keyString = count.keyString;

			/* Reset the mode, this will allow the remainder
			 * of the command to get processed.
			 */
			mode.reset(true);

			/* Clear the stack and push the unprocessed key.
			 * This will cause the key processing to
			 * restart.
			 */
			keyStack.reset();
			keyStack.push(keyString);
		};
		count.reset = function() {
			count.state = count.states.START;
			count.keyString = undefined;
		};

		this.mappings.push(count);

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
		gg.next = function(keyString) {
			switch (this.state) {
				case this.states.START:
					switch (keyString) {
						/* g */
						case "<g>":
							this.state = this.states.g;
							break;
						default:
							this.state = this.states.REJECT;
					};
					break;
				case this.states.g:
					switch (keyString) {
						/* Borrowed with love from the Vim help manual. */
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
								keyStack.reset();
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

	function SingleKeyMapping(keyString, action) {
		Mapping.apply(this, arguments);

		this.keyString = keyString;
		this.action = function() {
			keyStack.reset();
			mode.reset();
			action();
		}
	}

	SingleKeyMapping.prototype = new Mapping();
	SingleKeyMapping.prototype.next = function(keyString) {
		if (keyString == this.keyString) {
			this.state = this.states.ACCEPT;
		}
		else {
			this.state = this.states.REJECT;
		}
		return this.state;
	};

	var debug = new Debug(Debug.prototype.ALL);
	this.debug = debug;

	var keyStack = new KeyStack();
	this.keyStack = keyStack;

	var keyProcessor = new KeyProcessor(keyStack);
	this.keyProcessor = keyProcessor;

	var modes = {
		normal: new NormalMapper(),
	};
	this.modes = modes;

	var mode = this.modes.normal;
	this.mode = mode;
};


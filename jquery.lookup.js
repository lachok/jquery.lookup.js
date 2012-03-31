/*
 * A jQuery lookup plugin
 * 
 * Author: Lachezar Kozhuharov (github.com/lachok)
 *
 */

(function($) {

	var lastActiveTextBox = null;

    $.fn.lookup = function(options) {

		var lookupData = [];

		var defaults = {
			lookupRegex: /\d{1,6}/, // regex to determine matches
			lookupUrl: 'results_21306.js', // the url with lookup data
			textboxSelector: this.selector, // the text entry elements to watch
			propertyToMatch: 'sailnos', // property against which to lookup
			propertiesToReturn: ['Classtype', 'sailnos', 'sailor'], // properties to be displayed in the suggestions box and the textbox
			resultFormat: '{0} {1} ({2})', // format string for displaying the returned properties
			dataProperty: '',
			matchOnlyBeginningOfWord: false
		};

		options = $.extend(true, {}, defaults, options);

		var suggestionsBox = $('<div class="suggestionsBox"></div>').appendTo('body');
		var lastKnownCaretPosition = 0;
		var lastSelectedSuggestion = 0;

		function replaceWordInTextbox(li) {
			var lookup = $(li).find('.' + options.propertyToMatch).text(),
				matches = $.map(options.propertiesToReturn, function(el, ix){
					return $(li).find('.' + el).text();
				});

			if(matches.length > 0) {
				$(lastActiveTextBox).val(replaceCurrentWord(
					$(lastActiveTextBox).val(),
					lastKnownCaretPosition,
					formatString.apply(null, [options.resultFormat].concat(matches))
				));
			}

			suggestionsBox.hide();
			lastSelectedSuggestion = 0;
		}

		// On mousedown replace the word with the suggestion.
		// This has to be mousedown instead of click in order for it
		// to fire before the 'blur' event on the textbox.
		suggestionsBox.delegate('ul li', 'mousedown touchstart MozTouchDown', function() {
			replaceWordInTextbox(this);
			$(lastActiveTextBox).focus();
		});

		// hide the suggestions when the textbox loses focus
		$(options.textboxSelector).on('blur', function(e) {
			suggestionsBox.hide();
		});

		// on keydown of the textbox handle navigation of the
		// suggestions list
		$(options.textboxSelector).on('keydown', function(e) {
			lastActiveTextBox = this;
			if(e.keyCode == 40 && suggestionsBox.is(":visible")) {
				lastSelectedSuggestion++;
				if(lastSelectedSuggestion > suggestionsBox.find('ul li').get().length - 1) {
					lastSelectedSuggestion = 0;
				}
				highlightMatch(suggestionsBox, lastSelectedSuggestion);
				e.preventDefault();
				return;
			} else if(e.keyCode == 38 && suggestionsBox.is(":visible")) {
				lastSelectedSuggestion--;
				if(lastSelectedSuggestion < 0) {
					lastSelectedSuggestion = suggestionsBox.find('ul li').get().length - 1;
				}
				highlightMatch(suggestionsBox, lastSelectedSuggestion);
				e.preventDefault();
				return;
			} else if((e.keyCode == 39 || e.keyCode == 9 || e.keyCode == 13) && suggestionsBox.is(":visible")) { // tab key
				replaceWordInTextbox(suggestionsBox.find('ul li.selected'));
				lastSelectedSuggestion = 0;
				e.stopImmediatePropagation();
				e.preventDefault();
				return;
			} else if(e.keyCode == 8) {	// backspace key
				lastSelectedSuggestion = 0;
				highlightMatch(suggestionsBox, lastSelectedSuggestion);
				return;
			}
		});

		// on keyup or click of the textbox check for a matching
		// word under the cursor and show suggestions box
		$(options.textboxSelector).on('keyup click', function(e) {
			lastKnownCaretPosition = getCaret(this);
			var currentWord = getCurrentWord($(this).val(), lastKnownCaretPosition);

			if(options.lookupRegex.test(currentWord)) {
				lastActiveTextBox = this;
				suggestionsBox.show();
				showMatches(this, suggestionsBox, currentWord, lookupData, options);
				highlightMatch(suggestionsBox, lastSelectedSuggestion);
			} else {
				suggestionsBox.hide();
			}
		});

		getLookupData(options.lookupUrl, function(data) {
			if(options.dataProperty !== '') {
				lookupData = data[options.dataProperty];
			} else {
				lookupData = data;
			}
		});
	};

	function highlightMatch(suggestionsBox, ix) {
		suggestionsBox.find('ul li').removeClass('selected');
		suggestionsBox.find('ul li:eq(' + ix + ')').addClass('selected');
	}

	function replaceCurrentWord(text, caretPosition, newWord) {
		var currentWord = getCurrentWord(text, caretPosition),
			firstHalfOfText = text.slice(0, caretPosition).split(/\s/),
			firstHalfOfCurrentWord = firstHalfOfText[firstHalfOfText.length-1],
			caretPositionInWord = currentWord.indexOf(firstHalfOfCurrentWord) + firstHalfOfCurrentWord.length,
			wordStartIndex = caretPosition - caretPositionInWord;

		// remove matched word
		text = text.slice(0, wordStartIndex) + text.slice(wordStartIndex + currentWord.length);
		// insert new word
		text = text.substr(0, wordStartIndex) + newWord + text.substr(wordStartIndex);

		//console.log('Text after match removed: ' + text);

		return text;
	}

	function getCurrentWord(text, caretPosition) {
		var firstHalf = text.slice(0, caretPosition).split(/\s/),
			secondHalf = text.slice(caretPosition).split(/\s/),
			word = firstHalf[firstHalf.length -1] + secondHalf[0];

		return word;
	}

	function getCaret(el) { 
		if (el.selectionStart) { 
			return el.selectionStart; 
		} else if (document.selection) { 
			el.focus(); 

			var r = document.selection.createRange(); 
			if (r == null) { 
				return 0; 
			} 

			var re = el.createTextRange(),
			rc = re.duplicate();
			re.moveToBookmark(r.getBookmark());
			rc.setEndPoint('EndToStart', re);

			return rc.text.length;
		}
		return 0;
	}


	function showMatches(textbox, suggestionsBox, lookup, lookupData, settings) {
		var matches = getMatches(lookup, lookupData, settings);
		var suggestions = 'No matches found.'
		if(matches.length > 0) {
			suggestions = '<ul>' + $.map(matches, function(match, ixMatch){
				return '<li>' 
					+ formatString.apply(null, [settings.resultFormat].concat($.map(settings.propertiesToReturn, function(el, ix){
					return '<span class="' + settings.propertiesToReturn[ix] + '">' + match[el] + '</span>'
				}))) + '</li>';
			}).join('') + '</ul>';
		}

		var offset = $(textbox).offset();
		suggestionsBox.offset({
			top: offset.top + $(textbox).height() + 3,
			left:offset.left
		})

		suggestionsBox.empty().append(suggestions);
	}

	function getMatches(input, lookupData, settings) {
		input = $.trim(input + '');
		//console.log('Showing matches for "' + input + '"');
		var toReturn = [];
		for(var i = 0; i < lookupData.length; i++) {
			if((!settings.matchOnlyBeginningOfWord && (lookupData[i][settings.propertyToMatch] + '').toLowerCase().indexOf(input.toLowerCase()) > -1)
			 || (settings.matchOnlyBeginningOfWord && (lookupData[i][settings.propertyToMatch] + '').toLowerCase().indexOf(input.toLowerCase()) == 0)) {
				var match = {};
				for(var j = 0; j < settings.propertiesToReturn.length; j++) {
					match[settings.propertiesToReturn[j]] = lookupData[i][settings.propertiesToReturn[j]]
				}
				toReturn.push(match);
			}
		}
		return toReturn;
	}

	function error (jqXHR, textStatus, errorThrown) {
		//alert('error: ' + errorThrown);
		throw errorThrown;
	}

	function getLookupData (url, callback) {
		url = url;

		jQuery.ajax({
			type: 'GET',
			url: url,
			dataType: 'json',
			cache: false,
			success: callback,
			error: error
		});
	}

	/**
	* JavaScript format string function
	* 
	*/
	formatString = function(format) {
		var args = arguments;
		return format.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number*1+1] != 'undefined'
				? args[number*1+1]
				: '{' + number + '}';
		});
	};

	// public functions definition
	$.fn.lookup.refresh = function(url, callback) {
		getLookupData(url, callback);
	};

})(jQuery);
// A smaller version of https://github.com/Knockout-Contrib/Knockout-Validation (which is written by Eric M. Barnard under the MIT licence).
(function() {
  if (!ko) throw 'Knockout is required, please ensure it is loaded before loading this validation plug-in';

  ko.validation = {
    started: true,
    settings: {
      insertMessages: true,
      errorMessageClass: 'validationMessage',
    },
    validate: function(obj, options) {
      if (!options) options = {};
      if (options.showMessages === undefined) 
        options.showMessages = true;

      var validation_computed = ko.computed(function() {
        var isValid = true;
        for (var i in obj) {
          if (!obj.hasOwnProperty(i)) continue;
          var item = obj[i],
              isObservable = ko.isObservable(item);
          if (isObservable && item.validate) {
            item.showValidationMessage(options.showMessages);
            item.validationStarted(true);
            if (item.validate()) {
              isValid = false;
              continue;
            }
          }
          if (!options.deep)
            continue;

          var values = isObservable ? item() : item,
              type = Object.prototype.toString.call(values).slice(8, -1);
          if (type == 'Array' || type == 'Object') {
            if (!ko.validation.validate(values, options)) {
              isValid = false;
            }
          }
        }
        return isValid;
      });

      return options.returnComputed ? validation_computed : validation_computed();
    },
    isValid: function(obj, options) {
      if (!options) options = {};
      options.returnComputed = true;
      return ko.validation.validate(obj, options);
    },
    makeValidatable: function(observable) {
      if (observable.validate) return;
      observable.validationStarted = ko.observable(false);
      observable.showValidationMessage = ko.observable(true);
      observable.subscribe(function() {
        if (ko.validation.started) {
          observable.validationStarted(true);
        }
      });
      observable.validationRules = ko.observableArray();
      observable.validate = ko.computed(function() {
        var message = '',
            rules = observable.validationRules(),
            value = observable();
        if (!observable.validationStarted()) return;
        for (var i = 0, len = rules.length; i < len; i++) {
          var rule = rules[i],
              arg = ko.unwrap(rule.arg);
          if (arg === false || arg === undefined || arg === null) return;
          if (!rule.validator(value, arg)) {
            message = ko.unwrap(rule.message).replace('{0}', arg);
            break;
          }
        }
        return message ? {message: message, rule: rules[i].name} : null;
      });
      observable.isValid = function(showMessage) {
        if (showMessage !== undefined) {
          observable.showValidationMessage(showMessage);
        }
        observable.validationStarted(true);
        return !Boolean(observable.validate());
      };
      return observable;
    },
    // rules return true if valid
    rules: {
      required: function(val) {
        return val !== undefined && val !== null && Boolean(String(val).trim());
      },
      min: function(val, min) {
        return !val || val >= min;
      },
      max: function(val, max) {
        return !val || val <= max;
      },
      minlength: function(val, min) {
        return !val || val.length >= min;
      },
      maxlength: function(val, max) {
        return !val || val.length <= max;
      },
      digits: function(val) {
        return !val || /^\d+$/.test(val);
      },
      email: function(val) {
        var re = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;
        return !val || (val.length <= 254 && re.test(val));
      },
      pattern: function(val, regex) {
        return !val || regex.test(val);
      }
    },
    // allows localization
    messages: {
      required: 'This field is required',
      min: 'Please enter a value greater than or equal to {0}',
      max: 'Please enter a value less than or equal to {0}',
      minlength: 'Please enter at least {0} characters',
      maxlength: 'Please enter no more than {0} characters',
      digits: 'Please use only digits',
      email: 'Please enter a valid e-mail address',
      general: 'Please check this value'
    },
    registerExtender: function(name) {
      ko.extenders[name] = function(observable, args) {
        if (args === false || args === undefined || args === null) return;
        ko.validation.makeValidatable(observable);
        observable.validationRules.push({
          name: name,
          validator: args.validator || ko.validation.rules[name],
          message: args.message || ko.validation.messages[name] || ko.validation.messages.general,
          arg: args.arg || args
        });
        return observable;
      };
    },
    addRule: function(name, validator, message) {
      ko.validation.rules[name] = validator;
      ko.validation.messages[name] = message;
      ko.validation.registerExtender(name);
    }
  };

  for (var name in ko.validation.rules) {
    ko.validation.registerExtender(name);
  }
  ko.extenders.validationOptions = function(observable, args) {
    observable.validationOptions = args;
    return observable;
  };
  ko.validation.addRule('custom');

  var extend_binding_with_validation = function(name) {
    var original_init = ko.bindingHandlers[name].init;
    ko.bindingHandlers[name].init = function(element, valueAccessor, allBindingsAccessor) {
      original_init(element, valueAccessor, allBindingsAccessor);

      var observable = valueAccessor(),
          allBindings = allBindingsAccessor(),
          bindingOptions = allBindings.validationOptions,
          observableOptions = typeof(observable.validationOptions) == 'object' ? observable.validationOptions : null,
          globalOptions = ko.validation.settings,
          finalOptions = ko.utils.extend({}, globalOptions);

      if (observableOptions) {
        finalOptions = ko.utils.extend(finalOptions, observableOptions);
      }
      if (bindingOptions) {
        finalOptions = ko.utils.extend(finalOptions, bindingOptions);
      }

      if (!(observable.validate && finalOptions.insertMessages)) {
        return;
      }
      // insert a validation message element
      var div = document.createElement('div');
      div.className = finalOptions.errorMessageClass;
      element.parentNode.insertBefore(div, element.nextSibling);

      if (finalOptions.messageTemplate) {
        ko.renderTemplate(finalOptions.messageTemplate, {
          field: observable
        }, null, div, 'replaceNode');
      }
      ko.applyBindingsToNode(div, {
        validationMessage: observable
      });
    };
  };
  extend_binding_with_validation('textInput');
  extend_binding_with_validation('value');

  ko.bindingHandlers.validationMessage = {
    update: function(element, valueAccessor) {
      var observable = valueAccessor(),
          result = observable.validate();
      if (!result || !observable.showValidationMessage()) {
        element.style.display = 'none';
        return;
      }
      element.style.display = '';
      element[element.innerText ? 'innerText' : 'textContent'] = result.message;
    }
  };

})();

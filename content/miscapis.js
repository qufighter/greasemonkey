function GM_ScriptStorage(script) {
  this.prefMan = new GM_PrefManager(script.prefroot);
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error("Second argument not specified: Value");
  }

  if (!GM_apiLeakCheck("GM_setValue")) {
    return;
  }

  this.prefMan.setValue(name, val);
};

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  if (!GM_apiLeakCheck("GM_getValue")) {
    return undefined;
  }

  return this.prefMan.getValue(name, defVal);
};

GM_ScriptStorage.prototype.deleteValue = function(name) {
  if (!GM_apiLeakCheck("GM_deleteValue")) {
    return undefined;
  }

  return this.prefMan.remove(name);
};

GM_ScriptStorage.prototype.listValues = function() {
  if (!GM_apiLeakCheck("GM_listValues")) {
    return undefined;
  }

  return this.prefMan.listValues();
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_Resources(script){
  this.script = script;
}

GM_Resources.prototype.getResourceURL = function(name) {
  if (!GM_apiLeakCheck("GM_getResourceURL")) {
    return undefined;
  }

  return this.getDep_(name).dataContent;
};

GM_Resources.prototype.getResourceText = function(name) {
  if (!GM_apiLeakCheck("GM_getResourceText")) {
    return undefined;
  }

  return this.getDep_(name).textContent;
};

GM_Resources.prototype.getDep_ = function(name) {
  var resources = this.script.resources;
  for (var i = 0, resource; resource = resources[i]; i++) {
    if (resource.name == name) {
      return resource;
    }
  }

  throw new Error("No resource with name: " + name); // NOTE: Non localised string
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_ScriptLogger(script) {
  var namespace = script.namespace;

  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }

  this.prefix = [namespace, script.name, ": "].join("");
}

GM_ScriptLogger.prototype.log = function(message) {
  GM_log(this.prefix + message, true);
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_addStyle(doc, css) {
  var head = doc.getElementsByTagName("head")[0];
  if (head) {
    if (doc.gm_css_uri) {
      // If styles were added using style-sheet-service earlier delete the sheet
      // and add those syles to the document's <head> the normal way.
      // First, delete doc.gm_css_uri which prevents this block from recurring
      GM_clearStyleSheetServiceStyles(doc);
      GM_addStyle(doc, doc.gm_css_raw)
      delete doc.gm_css_raw;
    }
    var style = doc.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    head.appendChild(style);
  } else {
    // during document-start early injection while <head> is unavailable
    // append styles to the document using style-sheet-service
    // based on stylish components\stylishStyle.js
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);

    // we must store the total CSS in the sheet so the sheet is a single block
    // of CSS to manage, so that we only have to manage one sheet per document
    if (!doc.gm_css_raw) {
      doc.gm_css_raw = '';
    }else if (doc.gm_css_raw.substr(doc.gm_css_raw.length - 1) != ';') {
      doc.gm_css_raw += ";";
    }
    doc.gm_css_raw += css;

    // build the CSS URI rule which will only apply for the document's URL
    css = "@-moz-document url(" + doc.location.href + ") {" + doc.gm_css_raw + "}";
    var cssURI = ios.newURI("data:text/css," + encodeURIComponent(css), null, null);
    sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);

    //unload previous, now redundant, registered stylesheeet; if defined
    if (doc.gm_css_uri && sss.sheetRegistered(doc.gm_css_uri, sss.USER_SHEET)) {
     sss.unregisterSheet(doc.gm_css_uri, sss.USER_SHEET)
    }
    doc.gm_css_uri = cssURI; // remember the sheet for removal next time
  }
  return style;
}

function GM_clearStyleSheetServiceStyles(doc) {
  // this must be called when transitioning from style-sheet-service 
  // to the normal method of appending styles to the <head> element
  // it is called by the first GM_addStyle call that detects <head> 
  var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
  if (doc.gm_css_uri && sss.sheetRegistered(doc.gm_css_uri, sss.USER_SHEET)) {
   sss.unregisterSheet(doc.gm_css_uri, sss.USER_SHEET)
  }
  delete doc.gm_css_uri;
}

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_console(script) {
  // based on http://www.getfirebug.com/firebug/firebugx.js
  var names = [
    "debug", "warn", "error", "info", "assert", "dir", "dirxml",
    "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile",
    "profileEnd"
  ];

  for (var i=0, name; name=names[i]; i++) {
    this[name] = function() {};
  }

  // Important to use this private variable so that user scripts can't make
  // this call something else by redefining <this> or <logger>.
  var logger = new GM_ScriptLogger(script);
  this.log = function() {
    logger.log(
      Array.prototype.slice.apply(arguments).join("\n")
    );
  };
}

GM_console.prototype.log = function() {
};

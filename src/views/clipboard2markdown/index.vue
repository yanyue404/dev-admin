<template>
  <div class="container">
    <section id="info">
      <h1>Paste to Markdown</h1>
      <h2>Instructions</h2>
      <ol>
        <li>
          Find the text to convert to Markdown (<i>e.g.</i>, in another browser
          tab)
        </li>
        <li>
          Copy it to the clipboard (<code>Ctrl+C</code>, or
          <code>&#8984;+C</code> on Mac)
        </li>
        <li>
          Paste it into this window (<code>Ctrl+V</code>, or
          <code>&#8984;+V</code> on Mac)
        </li>
        <li>The converted Markdown will appear!</li>
      </ol>
      <p>
        The conversion is carried out by
        <a href="https://github.com/domchristie/to-markdown">to-markdown</a>, a
        Markdown converter written in JavaScript and running locally in the
        browser.
      </p>
    </section>
    <div contenteditable="true" id="pastebin"></div>
    <section class="hidden" id="wrapper">
      <textarea id="output"></textarea>
    </section>
    <img class="logo" src="@/assets/img/background.svg" />
  </div>
</template>

<script>
export default {
  beforeCreate() {
    // https://github.com/euangoddard/clipboard2markdown
    import("./to-markdown").then((res) => (window.toMarkdown = res.default));
  },
  mounted() {
    // http://pandoc.org/README.html#pandocs-markdown
    var pandoc = [
      {
        filter: "h1",
        replacement: function (content, node) {
          var underline = Array(content.length + 1).join("=");
          return "\n\n" + content + "\n" + underline + "\n\n";
        },
      },

      {
        filter: "h2",
        replacement: function (content, node) {
          var underline = Array(content.length + 1).join("-");
          return "\n\n" + content + "\n" + underline + "\n\n";
        },
      },

      {
        filter: "sup",
        replacement: function (content) {
          return "^" + content + "^";
        },
      },

      {
        filter: "sub",
        replacement: function (content) {
          return "~" + content + "~";
        },
      },

      {
        filter: "br",
        replacement: function () {
          return "\\\n";
        },
      },

      {
        filter: "hr",
        replacement: function () {
          return "\n\n* * * * *\n\n";
        },
      },

      {
        filter: ["em", "i", "cite", "var"],
        replacement: function (content) {
          return "*" + content + "*";
        },
      },

      {
        filter: function (node) {
          var hasSiblings = node.previousSibling || node.nextSibling;
          var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
          var isCodeElem =
            node.nodeName === "CODE" ||
            node.nodeName === "KBD" ||
            node.nodeName === "SAMP" ||
            node.nodeName === "TT";

          return isCodeElem && !isCodeBlock;
        },
        replacement: function (content) {
          return "`" + content + "`";
        },
      },

      {
        filter: function (node) {
          return node.nodeName === "A" && node.getAttribute("href");
        },
        replacement: function (content, node) {
          var url = node.getAttribute("href");
          var titlePart = node.title ? ' "' + node.title + '"' : "";
          if (content === url) {
            return "<" + url + ">";
          } else if (url === "mailto:" + content) {
            return "<" + content + ">";
          } else {
            return "[" + content + "](" + url + titlePart + ")";
          }
        },
      },

      {
        filter: "li",
        replacement: function (content, node) {
          content = content.replace(/^\s+/, "").replace(/\n/gm, "\n    ");
          var prefix = "-   ";
          var parent = node.parentNode;

          if (/ol/i.test(parent.nodeName)) {
            var index = Array.prototype.indexOf.call(parent.children, node) + 1;
            prefix = index + ". ";
            while (prefix.length < 4) {
              prefix += " ";
            }
          }

          return prefix + content;
        },
      },
    ];

    // http://pandoc.org/README.html#smart-punctuation
    var escape = function (str) {
      return str
        .replace(/[\u2018\u2019\u00b4]/g, "'")
        .replace(/[\u201c\u201d\u2033]/g, '"')
        .replace(/[\u2212\u2022\u00b7\u25aa]/g, "-")
        .replace(/[\u2013\u2015]/g, "--")
        .replace(/\u2014/g, "---")
        .replace(/\u2026/g, "...")
        .replace(/[ ]+\n/g, "\n")
        .replace(/\s*\\\n/g, "\\\n")
        .replace(/\s*\\\n\s*\\\n/g, "\n\n")
        .replace(/\s*\\\n\n/g, "\n\n")
        .replace(/\n-\n/g, "\n")
        .replace(/\n\n\s*\\\n/g, "\n\n")
        .replace(/\n\n\n*/g, "\n\n")
        .replace(/[ ]+$/gm, "")
        .replace(/^\s+|[\s\\]+$/g, "");
    };

    var convert = function (str) {
      return escape(toMarkdown(str, { converters: pandoc, gfm: true }));
    };

    var insert = function (myField, myValue) {
      if (document.selection) {
        myField.focus();
        sel = document.selection.createRange();
        sel.text = myValue;
        sel.select();
      } else {
        if (myField.selectionStart || myField.selectionStart == "0") {
          var startPos = myField.selectionStart;
          var endPos = myField.selectionEnd;
          var beforeValue = myField.value.substring(0, startPos);
          var afterValue = myField.value.substring(
            endPos,
            myField.value.length
          );
          myField.value = beforeValue + myValue + afterValue;
          myField.selectionStart = startPos + myValue.length;
          myField.selectionEnd = startPos + myValue.length;
          myField.focus();
        } else {
          myField.value += myValue;
          myField.focus();
        }
      }
    };

    // http://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
    var info = document.querySelector("#info");
    var pastebin = document.querySelector("#pastebin");
    var output = document.querySelector("#output");
    var wrapper = document.querySelector("#wrapper");

    document.addEventListener("keydown", function (event) {
      if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which).toLowerCase() === "v") {
          pastebin.innerHTML = "";
          pastebin.focus();
          info.classList.add("hidden");
          wrapper.classList.add("hidden");
        }
      }
    });

    pastebin.addEventListener("paste", function () {
      setTimeout(function () {
        var html = pastebin.innerHTML;
        var markdown = convert(html);
        // output.value = markdown;
        insert(output, markdown);
        wrapper.classList.remove("hidden");
        output.focus();
        output.select();
      }, 200);
    });
  },
};
</script>

<style lang="scss" scoped>
@media (min-width: 768px) {
  .container {
    width: 750px;
  }
}
@media (min-width: 992px) {
  .container {
    width: 970px;
  }
}
@media (min-width: 1200px) {
  .container {
    width: 1170px;
  }
}

code {
  padding: 2px 4px;
  font-size: 90%;
  color: #c7254e;
  background-color: #f9f2f4;
  border-radius: 4px;
}
.container {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.42857143;
  color: #333;
  background-color: #fff;
  margin: 10vh auto;
  padding-right: 15px;
  padding-left: 15px;
}
h1,
.h1 {
  font-size: 36px;
}
h1,
.h1,
h2,
.h2,
h3,
.h3 {
  margin-top: 20px;
  margin-bottom: 10px;
}
h1,
h2,
h3,
h4,
h5,
h6,
.h1,
.h2,
.h3,
.h4,
.h5,
.h6 {
  font-family: inherit;
  font-weight: 500;
  line-height: 1.1;
  color: inherit;
}
h2 {
  font-size: 22px;
  font-style: italic;
}
.logo {
  position: absolute;
  width: 10em;
  height: 10em;
  bottom: 10vh;
  right: 10vh;
  pointer-events: none;
}
.hidden {
  display: none !important;
}
#pastebin {
  opacity: 0.01;
  width: 100%;
  height: 1px;
  overflow: hidden;
}
#output {
  border: none;
  background: transparent;
  font-family: Consolas, "Liberation Mono", Courier, monospace;
  font-size: 13px;
  line-height: 19px;
  min-height: 78vh;
  overflow: auto;
  padding: 6px 10px;
  resize: none;
  width: 100%;
}
@media (prefers-color-scheme: dark) {
  .container {
    background-image: url("/assets/img/background-dark.svg");
    background-color: #222;
    color: white;
  }
  code {
    color: #ff7a9c;
    background-color: #0e0609;
  }
  a {
    color: #8fcbff;
  }
}
</style>

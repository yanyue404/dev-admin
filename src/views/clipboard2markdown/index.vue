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
// https://github.com/euangoddard/clipboard2markdown
import('./to-markdown')
  .then((res) => (window.toMarkdown = res.default))
  .then(() => import('./clipboard2markdown'))

export default {}
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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  font-family: Consolas, 'Liberation Mono', Courier, monospace;
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
    background-image: url('/assets/img/background-dark.svg');
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

import assert from "node:assert/strict";

function createClassList() {
  const values = new Set();
  return {
    add: value => values.add(value),
    remove: value => values.delete(value),
    contains: value => values.has(value),
    forEach: cb => Array.from(values).forEach(cb),
    toArray: () => Array.from(values),
  };
}

const headChildren = [];

globalThis.localStorage = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, value) {
    this.data.set(key, String(value));
  },
};

globalThis.document = {
  documentElement: {
    dataset: {},
    classList: createClassList(),
  },
  body: {
    classList: createClassList(),
  },
  head: {
    appendChild(node) {
      headChildren.push(node);
    },
  },
  createElement(tagName) {
    return { tagName, set rel(value) { this._rel = value; }, set id(value) { this._id = value; }, set href(value) { this._href = value; } };
  },
  getElementById(id) {
    return headChildren.find(node => node._id === id) ?? null;
  },
};

const { applyTheme, getStoredTheme } = await import("./themeStore.js");

applyTheme("cyberpunk");

assert.equal(document.documentElement.dataset.theme, "cyberpunk");
assert.equal(localStorage.getItem("nebula-theme"), "cyberpunk");
assert.equal(document.body.classList.contains("theme-cyberpunk"), true);
assert.equal(document.body.classList.contains("theme-standard"), false);
assert.equal(document.getElementById("theme-css"), null);

applyTheme("not-a-theme");

assert.equal(document.documentElement.dataset.theme, "standard");
assert.equal(getStoredTheme(), "standard");
assert.equal(document.body.classList.contains("theme-cyberpunk"), false);
assert.equal(document.body.classList.contains("theme-standard"), false);

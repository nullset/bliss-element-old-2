import { html, define, observe, raw, state } from "./BlissElement";

const Tabs = {
  styles: `
    :host nav {
      display: inline-flex;
    }
  `,
  attrs: {
    activeTab: { type: Number },
  },
  // constructorCallback() {
  //   console.log("CONSTRUCTOR", this);
  //   debugger;
  // },
  // componentWillLoad() {
  //   return {
  //     promise: new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         resolve("aoeu");
  //       }, 3000);
  //     }),
  //     placeholder: html`FOO BAR`,
  //     error: {
  //       message: html`This is an error`,
  //       callback: function () {
  //         console.log("ERROR", this);
  //       },
  //     },
  //   };
  // },
  // componentDidLoad() {
  //   debugger;
  // },
  connectedCallback() {
    observe(() => {
      this[state].activeTab = this[state].activeTab ?? 0;
    });
  },
  render() {
    return html`
      <nav part="tabs">
        <slot name="bliss-tab"></slot>
      </nav>
      <div part="content">
        <slot name="bliss-tab-content"></slot>
      </div>
    `;
  },
};
define("bliss-tabs", Tabs);

function tabbable(rootNode = "bliss-tabs") {
  return {
    attrs: {
      active: { type: Boolean },
    },
    connectedCallback() {
      this.tabs = this.getContext(rootNode);
      const nodes = Array.from(
        this.tabs.querySelectorAll(`:scope > ${this.tagName}`)
      );
      this[state].index = nodes.findIndex((node) => node === this);

      // If this.active is true, then set tabs[state]activeTab to be this tab.
      observe(() => {
        if (this[state].active) this.tabs[state].activeTab = this[state].index;
      });

      // If tabs[state].activeTab is this tab, then set this tab's active prop to true.
      observe(() => {
        this[state].active = this.tabs[state].activeTab === this[state].index;
      });
    },

    disconnectedCallback() {
      if (this.tabs[state].activeTab === this[state].index)
        this.tabs[state].activeTab = undefined;
    },
  };
}

const keyboardNavigable = {
  attrs: { tabindex: { type: Number, default: 0 } },
  connectedCallback() {
    this.addEventListener("keypress", (e) => {
      if (
        e.target === this &&
        !this[state].disabled &&
        ["Enter", " "].includes(e.key)
      ) {
        this.click(e);
      }
    });
  },
  onclick(e) {
    debugger;
  },
};

const Tab = {
  styles: `
    :host {
      border-bottom: 2px solid transparent;
      cursor: pointer;
    }
    :host([active]) {
      border-bottom-color: blueviolet;
    }
    :host([disabled]) {
      opacity: 0.5;
    }
    :host(:not(:nth-of-type(1))) {
      margin-left: 1rem;
    }
  `,
  render() {
    return html`<slot></slot>`;
  },
  onclick(e) {
    if (!this[state].disabled) {
      this.tabs[state].activeTab = this[state].index;
    }
  },
};
define("bliss-tab", Tab, {
  mixins: [tabbable("bliss-tabs"), keyboardNavigable],
});

const TabContent = {
  connectedCallback() {
    observe(() => {
      const activeIsNotHost = this.tabs[state].activeTab !== this[state].index;
      this[state].hidden = activeIsNotHost;
    });
  },
  render() {
    return html`<slot></slot>`;
  },
};
define("bliss-tab-content", TabContent, { mixins: tabbable("bliss-tabs") });

const AlertButton = {
  onclick() {
    alert("You have been alerted");
  },
};
define("bliss-alert-button", AlertButton, {
  base: HTMLButtonElement,
  extend: "button",
});

// ------------------

// Build a map of all native DOM methods that are defined on the generic Node/HTMLElement objects.
const baseElement = Object.create(HTMLElement.prototype, {});
const elementProperties = [];
let prop;
for (prop in baseElement) {
  elementProperties.push(prop);
}

function copyAttributes({ source, target }) {
  Array.from(source.attributes).forEach((attr) => {
    target.setAttribute(attr.name, attr.value);
    source.removeAttribute(attr.name);
  });
}

const PortalElement = {
  attrs: {
    active: { type: Boolean, default: false, reflect: false },
    slot: { type: String, default: "", reflect: false }, // Make slot not auto-populate with value.
  },

  constructorCallback() {
    console.log("OTHER");
    this.connected = false;
    this.tether = true;

    // this.defineCustomEvents(["active", "inactive"]);
  },

  connectedCallback() {
    this.connected = true;

    observe(() => {
      if (this[state].active) {
        // Observe can be called many times, so check to see if an exit already exists. If it does, then return early.
        if (this.exit) return;

        this.createExit();

        // Need a RAF to ensure that the shadowRoot is mounted.
        requestAnimationFrame(() => {
          const { width, height, top, left } = this.getBoundingClientRect();
          const styles = getComputedStyle(this);
          this.exit.styles = {
            display: styles.display,
            top: `${top}px`,
            left: `${left}px`,
          };
          this.placeholder.style.cssText += `; width: ${width}px; height: ${height}px;`;
          this.moveFromPortalToExit();
          this.proxyProperties();
          this.exit.tether = this.tether;
        });
      } else {
        // debugger;
        if (this.placeholder) this.placeholder.style = undefined;
        if (this.exit) {
          this.exit.tether = false;
          this.fireEvent("inactive");
          this.exit.tether = false;
          this.revokeProxiedProperties();
          this.moveFromExitToPortal();
          this.destroyExit();
        }
      }
    });
  },

  disconnectedCallback() {
    this.connected = false;
    this.destroyExit();
  },

  createExit() {
    if (this.exit) return;
    this.exit = document.createElement("portal-exit");
    this.exit.portal = this; // Reference the exit's portal property back to this <aha-portal> element.
    this.placeholder = this.shadowRoot.getElementById("placeholder");
    document.body.appendChild(this.exit);
  },

  moveFromPortalToExit() {
    // Move all attributes on the <aha-portal> node to the <aha-exit> node.
    copyAttributes({ source: this, target: this.exit });

    const frag = new DocumentFragment();
    Array.from(this.childNodes).forEach((node) => {
      frag.appendChild(node);
    });
    this.exit.appendChild(frag);
  },

  moveFromExitToPortal() {
    // Move all child nodes on the <aha-exit> node to the <aha-portal> node.
    while (this.exit.childNodes.length) {
      this.appendChild(this.exit.childNodes[0]);
    }

    // Move all attributes on the <aha-exit> node to the <aha-portal> node.
    copyAttributes({ source: this.exit, target: this });
  },

  destroyExit() {
    if (this.exit) this.exit.parentElement.removeChild(this.exit);
    this.exit = undefined;
  },

  proxyProperties() {
    this.originalProperties = new Map();
    elementProperties.forEach((prop) => {
      if (prop === "tagName") return;

      this.originalProperties.set(prop, this[prop]);

      if (typeof this[prop] === "function") {
        this[prop] = this.exit[prop].bind(this.exit);
      } else {
        Object.defineProperty(this, prop, {
          get: () => {
            return this.exit[prop];
          },
          set: (value) => {
            this.exit[prop] = value;
          },
          configurable: true,
        });
      }
    });
  },

  revokeProxiedProperties() {
    elementProperties.forEach((prop) => {
      if (prop === "tagName") return;

      const original = this.originalProperties.get(prop);

      if (typeof this[prop] === "function") {
        this[prop] = original.bind(this);
      } else {
        // Since <aha-portal> ultimately inherits from HTMLElement, deleting the prop here allows us to fall back to
        // the prop defined by HTMLElement.
        delete this[prop];
      }
    });
    this.originalProperties = undefined;
  },

  render() {
    return html`
      <div id="placeholder"></div>
      <slot></slot>
    `;
  },
};
define("portal-element", PortalElement);

const PortalExit = {
  attrs: {
    portal: { reflect: false },
    overlay: { reflect: false },
    styles: { reflect: false },
    tether: { type: Boolean },
    top: { type: Number },
    left: { type: Number },
    slot: { type: String, default: "", reflect: false }, // Make slot not auto-populate with value.
  },

  constructorCallback() {
    this.eventOptions = {
      capture: true,
      passive: false,
    };
    this.wheelHandler = this.wheelHandler.bind(this);
    this.mousedownHandler = this.mousedownHandler.bind(this);
    this.mouseupHandler = this.mouseupHandler.bind(this);
    this.scrollHandler = this.scrollHandler.bind(this);
    this.elementScrollPositions = new WeakMap();
    this.scrollbarClicked = false;
  },

  connectedCallback() {
    if (!this.portal) {
      console.error(
        new Error(
          "<portal-exit> should only be created by a parent <portal-element>."
        )
      );
      console.error(this);
    }

    this.exitParentElement = this.parentElement;
    this.exitPreviousElement = this.previousElementSibling;

    // observe(() => {
    //   if (this.componentHasLoaded) {
    //   }
    // });

    // new ResizeObserver((entries) => {
    //   debugger;
    // }).observe(this);

    observe(() => {
      if (this.tether) {
        window.addEventListener("wheel", this.wheelHandler, this.eventOptions);
        document.addEventListener(
          "mousedown",
          this.mousedownHandler,
          this.eventOptions
        );
        document.addEventListener(
          "mouseup",
          this.mouseupHandler,
          this.eventOptions
        );
        document.addEventListener(
          "scroll",
          this.scrollHandler,
          this.eventOptions
        );
      } else {
        window.removeEventListener(
          "wheel",
          this.wheelHandler,
          this.eventOptions
        );
        document.removeEventListener(
          "mousedown",
          this.mousedownHandler,
          this.eventOptions
        );
        document.removeEventListener(
          "mouseup",
          this.mouseupHandler,
          this.eventOptions
        );
        document.removeEventListener(
          "scroll",
          this.scrollHandler,
          this.eventOptions
        );
      }
    });
  },

  initialRenderCallback() {
    this.overlay = this.shadowRoot.getElementById("overlay");
    // this.updatedTether();

    new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this.portal.placeholder.style.width = `${width}px`;
      this.portal.placeholder.style.height = `${height}px`;
    }).observe(this.overlay);
  },

  mousedownHandler(e) {
    this.scrollbarClicked = true;
    this.elementScrollPositions.set(e.target, {
      top: e.target.scrollTop,
      left: e.target.scrollLeft,
    });
  },

  mouseupHandler(e) {
    this.scrollbarClicked = false;
  },

  scrollHandler(e) {
    if (this.scrollbarClicked) {
      const { top = 0, left = 0 } =
        this.portal.placeholder.getBoundingClientRect();
      this.overlay.style.top = `${top}px`;
      this.overlay.style.left = `${left}px`;
    }
  },

  wheelHandler(e) {
    e.preventDefault();
    let { pixelX, pixelY } = normalizeWheel(e);
    const { top = 0, left = 0 } =
      this.portal.placeholder.getBoundingClientRect();
    // Move the exit to be in the same position as the portal's placeholder.
    this.overlay.style.top = `${top - pixelY}px`;
    this.overlay.style.left = `${left - pixelX}px`;

    const nodePath = e.composedPath();
    nodePath.forEach((elem) => {
      // Only scroll on element nodes, not document/document-fragments. Ensures it works with shadowDOM.
      if (elem.nodeType !== Node.ELEMENT_NODE) return;

      // Ensure that the remaining wheel delta is updated by the scrollable amount as each element is scrolled.
      const origTop = elem.scrollTop;
      const origLeft = elem.scrollLeft;
      elem.scrollBy(pixelX, pixelY);
      const diffTop = elem.scrollTop - origTop;
      const diffLeft = elem.scrollLeft - origLeft;
      pixelY = pixelY - diffTop;
      pixelX = pixelX - diffLeft;
    });
  },

  // If the exit is removed and the portal is still active, then we should assume
  // that the exit was mistakenly removed and should be added back to the DOM in its
  // original position relative to other elements still on the page.
  disconnectedCallback() {
    // NOTE: To see if the portal element is connected to the page *would have been* a
    // great use case for the in-built property `isConnected`. Unfortunately, at the point
    // when the exit is disconnected we don't know if this would return the portal's
    // isConnected value, or (potentially) the proxied isConnected value (which would return
    // the value of the exit, which is, obviously *always* disconnected at this point).
    // Instead, we just check for the portal's `connected` property which is set to true
    // when the portal is connected to the page, and false when it is disconnected.
    if (this.portal && this.portal.connected && this.portal.active) {
      if (this.exitPreviousElement) {
        this.exitPreviousElement.insertAdjacentElement("afterend", this);
      } else if (this.exitParentElement) {
        this.exitParentElement.insertAdjacentElement("afterbegin", this);
      } else {
        console.error(new Error("Unable to re-add <aha-exit> to DOM tree."));
      }
    }
  },

  render() {
    return html`
      <div id="overlay" style=${this.style.cssText}>
        <slot></slot>
      </div>
    `;
  },
};
define("portal-exit", PortalExit);

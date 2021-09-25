# Bliss Element

## TLDR; Show me stuff

Pull down the repository, switch to the directory, `npm install` everything (or better yet, use `pnpm install`), and then `npm run dev`. Open a browser to `localhost:5033`.

Making a web component is easy:

```
// --- In javascript

import { html, css, define, observe } from "./BlissElement";

const Hello = {
  attrs: { name: { type: String, default: "Danielle" } },
  styles: css`
    :host {
      color: red;
    }
  `,
  connectedCallback() {
    observe(() => {
      console.log(`Name has been changed to: ${this.state.name}`);
    })
  },
  render() {
    return html`
      <h1>
        Hello ${this.state.name}!
        <slot>How are you today?</slot>
      </h1>
    `;
  },
};
define("bliss-hello", Hello);


// --- In HTML
<bliss-hello name="Frank">How are you tonight?</bliss-hello>

```

## Why another web component library?

Because sane defaults, coupled with observable state, coupled with composable behaviors is powerful.

## What makes Bliss Element unique?

### Sane defaults

- All web components have a shadowRoot (unless specified otherwise)
- All observed attributes automatically reflect to a property, and this property's value also automatically reflects back to the attribute (unless otherwise specified). We can call these "_observed properties_".
- All web components have a `state` property which can be observed and which can trigger reactions on value changes
- All observed properties are accessible via either `this.propName` or `this.state.propName`
- Any change to a an observed property's value automatically changes the `this.state.propName` value, and vice versa
- All observed attributes can be passsed a default value. This value will automatically be assigned to the element's attribute, property, and state.

### Lifecycle methods

Native web components have a few lifecycle methods:

- `constructor` (when class is defined)
- `connectedCallback` (when element is mounted to the page)
- `disconnectedCallback` (when element is unmounted from the page)
- `attributeChanged` (when an observed attribute changes)
- `adoptedCallback` (when an element is moved to a different document)

Bliss enhances this with a few more:

- `constructor`
  - `constructorCallback`
- `connectedCallback`
  - `componentWillLoad` - Called once the component is connected to the DOM. Only fires a single time, no matter how many times the component is disconnected/re-connected to the page.
  - `componentDidLoad` - Called once the component has actually rendered to the page. Only fires a single time, no matter how many times the component is disconnected/re-connected to the page.

An astute reader will notice that there's no `attributeChanged` method. Why? Because Bliss Element has extracted this away (see section below for details).

### Attributes, properties, and state

Bliss treats web components as though they are just "bags of state" that happen to render something to the page.

Each Bliss web component has, at its core, a `state` property. This `state` can include anything (strings, numbers, objects, array, booleans, functions, etc.)

The `state` property is automatically observed, and any changes to the state can trigger reactions in:

- the web component itself
- any web component that is linked via context
- any bit of javascript that is listening for a change to that element's state

Any time an observed attribute changes, Bliss will automatically typecast that value (ex. a Boolean value is `true`/`false` rather than the value of `''` or `undefined` as in an attribute), and automatically set that typecast value to the element's associated property.

Simultaneously, that associated property is linked to a property with the same name in the element's `state`. Any update to the property will trigger an update to the linked property in state, and any update to the state's property will trigger an update to the property.

```
// <my-element> has an observable attribute called "active"
// which should be typecast to a Boolean.

const myElem = document.querySelector('my-element');

myElem.setAttribute('active', '');
// updates <my-element> to have an active attribute:
// <my-element active>

console.log(myElem.active);
// true

console.log(myElem.state.active);
// true

myElem.state.active = false;

console.log(myElem.active);
// false

// updates <my-element> to remove the active attribute:
// <my-element>
```

#### Passing in complex objects as attributes

TODO

### Observability

A reaction based on the observed state will only fire if the part of state in question changes. For example, if we have a state:

```
this.state = {
  name: 'Danielle',
  email: 'danielle@example.com'
}
```

and we have two reactions set up:

```
// Reaction #1
observe(() => console.log(this.state.name));

// Reaction #2
observe(() => console.log(this.state.name, this.state.email))
```

and we change the value of `email`:

```
this.state.email = 'dani@example.com';
```

the second reaction would fire but not the first.

### Context

TODO

### Rendering

The `render` function of a Bliss web component utilizes `observe`. If any referenced value inside the `render` function changes the render function will automatically be called.

Because we render using tagged template literals, only the individual DOM nodes/attributes that need to change due to an update will be changed.

```
render() {
  return html`
    <div id="root">
      <div id="name">${this.state.name}</div>
      <div id="email">${this.state.email}</div>
    </div>
  `
}
```

If the value of `state.email` changes, the render function will be called and _**only the text contents**_ of the <div> with an id of "email" will be changed.

This makes for extremely performant re-renders.

### Composability

All web components are, at their core, a new class that extends HTMLElement (or some other HTML-element, if extending a built-in element like <button>). In order to utilize parts of a class within another class, we have to create a new class and extend that.

```
class Foo extends HTMLElement {
  observedAttributes() {
    return ['canDrag'];
  }
  onDrag() {
    ... do stuff
  }
  doBadStuff() {

  }
  ... some other capabilities/behaviors ...
}

class Bar extends Foo {
  observedAttributes() {
    return ['canDrag', 'announce'];
  }
  flashOnDragEnd() {
    ... do stuff
  }
  ... inherits `onDrag`, `doBadStuff`, and all the other capabilities/behaviors of Foo
}
```

In this example, we'd really rather that Bar _not_ have the `doBadStuff` method, but because we're inheriting from Foo we don't get any say in the matter.

Extending base classes leads to well-known problems (https://en.wikipedia.org/wiki/Fragile_base_class) which introduce complexity and fragility into your code base.

A better solution to "use" the capabilities/behaviors of one web component in another compenent is to extract those desired capabilities/behaviors into a shared "concern" and then **compose** our web component so that it can _use_ that concern.

https://medium.com/@_ericelliott/why-composition-is-immune-to-fragile-base-class-problem-8dfc6a5272aa

For example:

```
const draggable = {
  attrs: {
    canDrag: { type: Boolean }
  },
  onDrag() {
    ... do stuff
  },
  connectedCallback() {
    ... do stuff
  }
  logOnDragStart() {
    console.log('Draggable logOnDragStart');
  }
}

const Foo = define('example-foo',
  {
    doBadStuff() {
      ... do stuff
    }
  },
  {mixins: [draggable, someOtherMixin]}
);

const Bar = define('example-bar',
  {
    attrs: {
      announce: { type: Boolean }
    },
    connectedCallback() {
      ... do stuff
    },
    flashOnDragEnd() {
      ... do stuff
    },
    logOnDragStart() {
      console.log('Bar logOnDragStart');
    }

  },
  {mixins: draggable}
);

```

In this example, both <example-foo> and <example-bar> web components have the "ability" to handle `onDrag`, however only <example-foo> has the ability to `doBadStuff`, and only <example-bar> has the ability to `flashOnDragEnd`.

In Bliss web components, any object can be composed with any other object. There are a few things to keep in mind though:

#### Rules of composition

- Any lifecycle method is additive. In the example above, this means that Bar will fire draggable's connectedCallback method _and_ its own connectedCallback method when the component appears on the page.
- `attrs` are mixed together. In the example above, this means that Bar will ultimately have `attrs` that look like:
  ```
    attrs: {
      canDrag: { type: Boolean },
      announce: { type: Boolean }
    }
  ```
  If our component defines the same `attr` key as an earlier mixin, our component's `attr` key will override the earlier mixin's.
- All other methods, variables, etc. will be overwritten by composition. In the example above, this means that if we have a web component based on Bar and we call Bar's `logOnDragStart` method, we will see a log message of "Bar logOnDragStart" rather than "Draggable logOnDragStart".

While this may sound like a lot to keep in mind, in practice it makes building surprisingly complex behaviors easy.

Concerns that are shared between different components can have _both_ their lifecycle methods and their associated attributes/properties/state mixed into those components with essentially no effort.

Anything that is unique to a specific web component (ex. properties, non-lifecycle methods) override any pre-existing property/method from earlier mixins.

### Event handling

Web components usually have events associated with them. Sometimes it is possible in advance to decide what behavior should happen when an event happens. Other times we would want an event to be context-sensitive. This makes event handling in web components frustrating, as we're not always able to decide what should happen until such time as the component is in use.

Wouldn't it be great if we could define an event on a web component and also re-define it ... or remove it altogether ... if we don't want it in a specific context?

Surprise, we can, by using the `handleEvent` method.

https://medium.com/@WebReflection/dom-handleevent-a-cross-platform-standard-since-year-2000-5bf17287fd38

Any event can be defined directly on our Bliss web component just by prefacing it with `on` (ex. `onclick` or `onmouseenter`):

```
const Bar = define('example-bar',
  {
    onclick(event) {
      ... do stuff
    }

  }
);
```

rather than the usual:

```
class Bar extends Foo {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      ... do stuff
    });
  }
}
```

or

```
class Bar extends Foo {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
    this.addEventListener('click', this.handleClick);
  }
  handleClick(event) {
    ... do stuff
  }
}
```

#### Why would we want to define events in this weird way??

- It's memory friendly.
  - Inline methods like in the first class-based example create a function for each instance of the <example-foo> component. If we have 20 <example-foo> elements on a page, we also have 20 functions in memory. By defining `onclick` directly in our component there is only a single `click` handler defined for **all** <example-foo> elements.
- No need to `bind`
  - Unlike the second class-based example, we don't have to bind `this` to our event. Binding is handled automatically. Inside the `onclick` event of the Bliss-based component, `this` is automatically defined to be the component itself.
- We can re-define an event at runtime.
  - Need your web component's `click` behavior to do something different than you originally specified? Easy. Just define it at runtime `<example-foo onclick="alert()">` or, more likely, via a reference to the element:
    ```
    const myElem = document.querySelector('example-foo');
    myElem.onclick = (event) => {
      ... my new behavior
    }
    ```
- We can remove an event entirely if we don't want it.
  - `<example-foo onclick="">` or `delete myElem.onclick`.
- Impossible to accidentally have multiple `onclick` handlers
  - _Caveat_ - This can be a bad thing, sometimes you _want_ multiple handlers for the same event. In that case, it's still possible to use `addEventListener` for the second, third, etc. events. In this case I would think of which event is the event you likely _always_ want to fire, and set _that_ event using `on[eventname]` syntax.

#### Not locked in

While I feel that utilizing the `handleEvent` when creating events gives us a lot of power, it may feel unfamiliar.

_If you don't like it, don't use it._

Nothing is preventing you from defining your components using good ole' `addEventListener`.

## Still in progress

- Non-shadowRoot web components (working but needs to handle attached styles)
  - Handling of <slot> in non-shadowRoot web component
- Extend built-in elements (ex. custom component based on <input>)
- Refs to shadowRoot DOM nodes (not really necessary as it operates on the real DOM, but a nice convenience)

## Pluses/Minuses

### Pluses

- Makes us truly know and understand web components and associated standards/APIs
- It's home-grown, so we can easily see and fix any problems without waiting for upstream PRs
- We can make our own decisions about standard behaviors/patterns that we want to use
- Built using web standards and APIs
  - No build step required
- BlissElement will work side by side with other web component libraries
- Super easy to compose complex behaviors
- Exposed observable state makes it trivial for React/JS to interop with Bliss components, and unlocks a lot of powerful possibilities

### Minuses

- It's home-grown, so we have to maintain it ourselves
- No larger community ... if we can't figure out a problem, no one will
- Not well tested at this point
  - Only manual tests so far. I wrote it in 3 evenings, cut me some slack :P

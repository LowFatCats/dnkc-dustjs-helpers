# DNKC DustJS Helpers

This package provides a collection of DustJS helpers for DNKC.

This package is intended to be used with Node only.

## Custom helpers

### `@pet`

Retrieves the pet details given an id from db and adds it to the context
under `pet` property.

Usage:
```
{@pet id="12345"}
    Name: {pet.animalName}
    Breed: {pet.animalBreed}
{/pet}
```

### `@article`

Retrieves an article with an id from db and adds it to the context
under `article` property.

Usage:
```
{@article id="12345"}
    Title: {article.title}
{/article}
```

### `@gallery`

Creates a DustJS context for a gallery as:

```js
{
   "items": [],
   "size": "(width)x(height)",
   "title": "Some title",
   "prefix": "http://url.com/path/"
}
```

Any properties specified in the helper will be converted to the javascript
context object.

### `@img`

Add a new image to the current gallery context items as:

```js
{
  "image": "images/layout/sample.jpg",
  "image__thumb": "images/layout/sample__thumb.jpg",
  "size": "2000x1333"
}
```

## Sample usage for `@gallery` and `@img` helpers:

```
{@gallery prefix="http://url.com/path/images/"}
  {@img src="sam.jpg" caption="Samuel"/}
  {@img src="jasper.jpg" thumb="jasper_th.jpg" size="2000x1333" /}
  {>your-render set=gallery.items for="photos"/}
{/gallery}
```

In the snippet above `{>your-render /}` DustJS partial is being instantiated using the context:

```js
{
    for: "photos",
    set: [
        {
            image: "http://url.com/path/images/sam.jpg",
            caption: "Samuel"
        },
        {
            image: "http://url.com/path/images/jasper.jpg",
            image__thumb: "http://url.com/path/images/jasper_th.jpg",
            size: "2000x1333"
        }
    ]
}
```

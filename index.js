(function (root, factory) {
  if (typeof exports === 'object') {
    var dust;

    try {
      dust = require('@lowfatcats/dustjs-helpers');
    } catch (error) {}

    if (!dust) {
      try {
        dust = require('dustjs-linkedin');
      } catch (error) {}
    }

    if (dust) {
      module.exports = factory(dust);
    } else {
      module.exports = {};
    }
    module.exports.registerWith = factory;
  } else {
    factory(root.dust);
  }
})(this, function (dust) {
  function log() {
    console.log('dnkc-dustjs-helpers:', ...arguments);
  }

  // Data store from DynamoDB
  function initStore() {
    function initDynamoDBStore() {
      var store;
      try {
        store = require('@lowfatcats/datastore-dynamodb');
        log('using DynamoDB store');
      } catch (err) {
        return null;
      }

      return {
        get: (type, id) => {
          prefix = '';
          switch (type) {
            case 'article':
              prefix = 'article#';
              break;
            default:
              break;
          }
          return store
            .get(prefix + id)
            .then(result => result.Item.Data)
            .catch(log);
        },
      };
    }

    // Data store from a list of samples
    // Used during local development
    function initSamplesStore(storePath) {
      var path = require('path');
      var fs = require('fs');

      var samplesPath = storePath || path.resolve(__dirname, '../../../app/context/samples');
      if (fs.existsSync(samplesPath)) {
        log('using static samples (' + samplesPath + ')');
      } else {
        return null;
      }

      var loadSync = function (fileName) {
        const fullPath = path.join(samplesPath, fileName);
        const data = JSON.parse(fs.readFileSync(fullPath));
        return data;
      };

      var config = loadSync('config.json');

      var load = function (fullPath) {
        return new Promise((resolve, reject) => {
          fs.readFile(fullPath, (err, data) => {
            if (err) {
              return reject(err);
            }
            const parsed = JSON.parse(data);
            resolve(parsed);
          });
        });
      };

      function fileExists(name) {
        return new Promise((resolve, reject) => {
          let file = path.join(samplesPath, name);
          fs.access(file, fs.constants.R_OK, err => {
            if (err) {
              return reject(err);
            }
            resolve(file);
          });
        });
      }

      function findSample(type, id) {
        return fileExists(id + '.json').catch(() => {
          return fileExists(type + id + '.json').catch(() => {
            return fileExists(type + '-' + id + '.json').catch(() => {
              return fileExists(config['default'][type]);
            });
          });
        });
      }

      return {
        get: (type, id) => findSample(type, id).then(load),
      };
    }

    // Fallback data store that always resolved with an empty object
    function initEmptyStore() {
      log('WARNING: no store configured');
      const noop = () => Promise.resolve({});
      return {
        get: noop,
      };
    }

    var store = initDynamoDBStore();
    if (!store) {
      store = initSamplesStore();
    }
    if (!store) {
      store = initEmptyStore();
    }
    return store;
  }

  var store = initStore();

  /**
   * Retrieves an item from the store given an id and adds it to the context
   * under 'type' property. If you specify a "prop" params, then the data will
   * be provided under 'prop' property.
   */
  function addItemToContextAndRender(type, chunk, context, bodies, params) {
    var id = context.resolve(params.id);
    var prop = params.prop ? context.resolve(params.prop) : type;

    if (id && typeof id === 'string') {
      // Gets an item by ID
      return chunk.map(function (chunk) {
        store
          .get(type, id)
          .then(data => {
            chunk
              .render(
                bodies.block,
                context.push({
                  [prop]: data,
                })
              )
              .end();
          })
          .catch(err => {
            chunk.setError(err).end();
          });
      });
    }

    return chunk;
  }

  // Custom Helpers
  var helpers = {
    /**
     * Retrieves the pet details given an id and adds it to the context
     * under 'pet' property
     */
    pet: function (chunk, context, bodies, params) {
      return addItemToContextAndRender('pet', chunk, context, bodies, params);
    },

    /**
     * Retrieves an article content given an id and adds it to the context
     * under 'article' property
     */
    article: function (chunk, context, bodies, params) {
      return addItemToContextAndRender('article', chunk, context, bodies, params);
    },

    /**
     * Creates a gallery context as:
     *
     * {
     *    "items": [],
     *    "size": "(width)x(height)",
     *    "title": "Some title",
     *    "prefix": "http://url.com/path/"
     * }
     */
    gallery: function (chunk, context, bodies, params) {
      const gallery = { items: [] };
      const prop = params.prop ? context.resolve(params.prop) : 'gallery';
      for (var key in params) {
        gallery[key] = context.resolve(params[key]);
      }
      if (bodies && bodies.block) {
        context = context.push({
          [prop]: gallery,
        });
        chunk = chunk.render(bodies.block, context);
      }
      return chunk;
    },

    /**
     *  Updates the current context (e.g. gallery) with a new image as:
     *
     *  {
     *    "image": "images/layout/sample.jpg",
     *    "image__thumb": "images/layout/sample__thumb.jpg",
     *    "size": "2000x1333"
     *  }
     */
    img: function (chunk, context, bodies, params) {
      const img = {};
      const gallery = context.stack.head.gallery;
      if (!gallery || !gallery.items) {
        return context;
      }
      const prefix = gallery.prefix || '';
      for (var key in params) {
        switch (key) {
          case 'src':
            img.image = prefix + context.resolve(params[key]);
            break;
          case 'thumb':
            img.image__thumb = prefix + context.resolve(params[key]);
            break;
          default:
            img[key] = context.resolve(params[key]);
            break;
        }
      }
      if (!img.size && gallery.size) {
        img.size = gallery.size;
      }
      gallery.items.push(img);
      return chunk;
    },
  };

  for (var key in helpers) {
    dust.helpers[key] = helpers[key];
  }

  return dust;
});

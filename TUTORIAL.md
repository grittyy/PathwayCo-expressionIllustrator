# STEP 0 - Intro to ADAMA

## HTML

```html
<div class="results"></div>
```

## JavaScript

```javascript
var showResults = function showResults( json ) {
  var obj = json.obj || json;
  $( '.results', appContext ).html( '<pre><code>' + JSON.stringify( obj, null, 2 ) + '</code></pre>' );
};

showResults( Agave.api.adama.help() );

// Status
// Agave.api.adama.getStatus( {}, showResults );

// Namespaces
// Agave.api.adama.getNamespaces( {}, showResults );

// Services available in a Namespace
// Agave.api.adama.getServices( { 'namespace': 'aip' }, showResults );

// Service details
// Agave.api.adama.getService( { 'namespace': 'aip', 'service': 'atted_coexpressed_by_locus_v0.1' }, showResults );
// Agave.api.adama.getService( { 'namespace': 'aip', 'service': 'locus_gene_report_v0.1' }, showResults );
```

## Service Documentation

- [API Docs](https://github.com/Arabidopsis-Information-Portal/devzone/blob/master/AIPWebServices.md)
- [ATTED Docs](https://github.com/Arabidopsis-Information-Portal/devzone/blob/master/AIPWebServices.md#atted-atted_coexpressed_by_locus_v01)
- [Gene Report Docs](https://github.com/Arabidopsis-Information-Portal/devzone/blob/master/AIPWebServices.md#aip-locus_gene_report_v01)

# STEP 1 - Querying ADAMA

## JavaScript

Keep the `showResults` function, but the rest of the code from STEP 0
can be deleted.

```javascript
var query = {
  locus: 'AT2G39730',
  relationship_type: 'correlation_coefficient',
  threshold: 0.85
};

Agave.api.adama.search(
  { 'namespace': 'aip', 'service': 'atted_coexpressed_by_locus_v0.1', 'queryParams': query },
  showResults
);

// Agave.api.adama.search(
//   { 'namespace': 'aip', 'service': 'locus_gene_report_v0.1', 'queryParams': query },
//   showResults
// );
```

# STEP 2 - Basic Forms

## JavaScript

Still keeping the `showResults` function:

```javascript
$( 'form', appContext ).on('submit', function(e) {
  e.preventDefault();
  showResults( $(this).serializeArray() );

  // STEP 2.1
  // showResults( this.locus.value );

  // STEP 2.2
  // var query = {
  //   locus: this.locus.value,
  //   relationship_type: 'correlation_coefficient',
  //   threshold: 0.85
  // };
  // Agave.api.adama.search({
  //   'namespace': 'aip', 'service': 'atted_coexpressed_by_locus_v0.1', 'queryParams': query
  // }, showResults);
});
```

## HTML

```html
<form method="post">
  <div class="form-group">
    <label class="control-label" for="wt_locus">Locus</label>
    <input class="form-control" type="text" name="locus" id="wt_locus" placeholder="For example, AT2G39730" value="AT2G39730">
  </div>

  <div class="form-group">
    <button type="submit" class="btn btn-primary">Search</button>
  </div>
</form>

<div class="results"></div>
```

# STEP 3 - Rendering Results

Single page apps

Use templates/template engines to render HTML inside of applications

- [Handlebars](http://handlebarsjs.com/)
- [Underscore Templates](http://underscorejs.org/#template)

We'll use Underscore Templates:

```bash
$ bower install underscore --save
```

Make sure to "import" Underscore `_` to your App closure:

```javascript
/*global _*/
/*jshint camelcase: false*/
(function(window, $, _, undefined) {
  //...
})(window, jQuery, _);
```

## Our template

```html
<table class="table">
  <thead>
    <tr>
      <th>Related Locus</th>
      <th>Direction</th>
      <th>Score</th>
    </tr>
  </thead>
  <tbody>
    <!-- each result will get need row -->
    <tr>
      <td>...</td>
      <td>...</td>
      <td>...</td>
    </tr>
  </tbody>
</table>
```

```javascript
var resultTableHtml =
  '<table class="table">' +
    '<thead>' +
      '<tr><th>Related Locus</th><th>Direction</th><th>Score</th></tr>' +
    '</thead>' +
    '<tbody>' +
      '<% _.each(result, function(r) { %>' +
        '<tr>' +
          '<td><%= r.related_entity %></td>' +
          '<td><%= r.relationships[0].direction %></td>' +
          '<td><%= _.values(r.relationships[0].scores[0])[0] %></td>' +
        '</tr>' +
      '<% }) %>' +
    '</tbody>' +
  '</table>';
```

Declare the templates above the `showResults` function. Here is the `templates`
object (whitespace removed) and ready to use:

```javascript
var templates = {
  resultTable: _.template('<table class="table"><thead><tr><th>Related Locus</th><th>Direction</th><th>Score</th></tr></thead><tbody><% _.each(result, function(r) { %><tr><td><%= r.related_entity %></td><td><%= r.relationships[0].direction %></td><td><%= _.values(r.relationships[0].scores[0])[0] %></td></tr><% }) %></tbody></table>')
};
```

And updated "show results" function for rendering:

```javascript
var showResults = function( json ) {

  // show error message for invalid object
  if ( ! ( json && json.obj ) ) {
    $( '.results', appContext ).html( '<div class="alert alert-danger">Invalid response!</div>' );
    return;
  }

  $( '.results', appContext ).html( templates.resultTable( json.obj ) );
};
```

## Sorting and Filtering

[DataTables](http://www.datatables.net/) is a popular jQuery plugin
that adds sorting, filtering, and paging to tables. There are tons
of configuration options, but even just the default settings are
pretty useful in a lot of cases:

```bash
$ bower install datatables --save
```

Add the following at the end of the `showResults` function:

```javascript
$( '.results table', appContext ).dataTable();
```

# STEP 4 - API Mashups

Integrating a second service. Let's add a button to our result
row. Update the template code with the following:

```javascript
var templates = {
  resultTable: _.template('<table class="table"><thead><tr><th>Related Locus</th><th>Direction</th><th>Score</th></tr></thead><tbody><% _.each(result, function(r) { %><tr><td><%= r.related_entity %> <button name="gene-report" data-locus="<%= r.related_entity %>" class="btn btn-link btn-sm"><i class="fa fa-book"></i><span class="sr-only">Get Gene Report</span></button></td><td><%= r.relationships[0].direction %></td><td><%= _.values(r.relationships[0].scores[0])[0] %></td></tr><% }) %></tbody></table>')
};
```

This adds a `<button>` to the first `<td>`. Note the `data-locus` attribute.
This will allow us to easily retrieve the locus the button relates to without
the need to DOM gymnastics.

```html
<button name="gene-report" data-locus="<%= r.related_entity %>" class="btn btn-link btn-sm">
  <i class="fa fa-book"></i>
  <span class="sr-only">Get Gene Report</span>
</button>
```

Now we attach an event to the button. When the button is clicked, we want to
retrieve the locus value and query for the locus gene report from Adama.

Update our `showResults` function with the below

```javascript
var showResults = function( json ) {

  // show error message for invalid object
  if ( ! ( json && json.obj ) ) {
    $( '.results', appContext ).html( '<div class="alert alert-danger">Invalid response!</div>' );
    return;
  }

  $( '.results', appContext ).html( templates.resultTable( json.obj ) );

  $( 'button[name=gene-report]', appContext ).on('click', function( e ) {
    e.preventDefault();

    var locus = $(this).attr('data-locus');

    var query = {
      locus: locus
    };

    Agave.api.adama.search(
      {'namespace': 'aip', 'service': 'locus_gene_report_v0.1', 'queryParams': query},
      function(search) {
        console.log(search);
      }
    );
  });

  $( '.results table', appContext ).dataTable();
};
```

Now, instead of just logging to the console, let's display the Gene report in a
[modal overlay](http://getbootstrap.com/javascript/#modals). First, the template:

```html
<div class="modal fade">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" data-dismiss="modal" class="close"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
        </button>
        <h4>Gene Report: <%= locus %></h4>
      </div>
      <div class="modal-body">
        <% _.each(properties, function(prop) { %>
          <h3><%= prop.type.replace("_"," ") %></h3>
          <p>
            <%=prop.value %>
          </p>
        <% }) %>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>
```

Add that to our templates (condensed):

```javascript
var templates = {
  resultTable: _.template('<table class="table"><thead><tr><th>Related Locus</th><th>Direction</th><th>Score</th></tr></thead><tbody><% _.each(result, function(r) { %><tr><td><%= r.related_entity %> <button name="gene-report" data-locus="<%= r.related_entity %>" class="btn btn-link btn-sm"><i class="fa fa-book"></i><span class="sr-only">Get Gene Report</span></button></td><td><%= r.relationships[0].direction %></td><td><%= _.values(r.relationships[0].scores[0])[0] %></td></tr><% }) %></tbody></table>'),
  geneReport: _.template('<div class="modal fade"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" data-dismiss="modal" class="close"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button><h4>Gene Report: <%= locus %></h4></div><div class="modal-body"><% _.each(properties, function(prop) { %><h3><%= prop.type.replace("_"," ") %></h3><p><%= prop.value %></p><% }) %></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>')
};
```

Then, update the `Agave.api.adama.search` callback to render the template and
display the modal:

```javascript
Agave.api.adama.search(
  {'namespace': 'aip', 'service': 'locus_gene_report_v0.1', 'queryParams': query},
  function(search) {
    var html = templates.geneReport(search.obj.result[0]);
    $(html).appendTo('body').modal();
  }
);
```

# The Finished Application

We can add some more form fields to our application to give user control
over additional query parameters, like the threshold value.

```html
<div class="science-app" data-app-name="workshop-tutorial">
  <h2>Hello, <span class="profile-name">AIP Science App</span>!</h2>

  <form method="post" name="workshop-tutorial-query">
    <div class="messages"></div>
    <div class="row">
      <div class="col-sm-4">
        <div class="form-group">
          <label class="control-label" for="wt_locus">Locus</label>
          <input class="form-control" type="text" name="locus" id="wt_locus" placeholder="For example, AT2G39730" value="AT2G39730">
        </div>
      </div>
      <div class="col-sm-4">
        <div class="form-group">
          <label class="control-label" for="wt_relationship_type">Relationship type</label>
          <select class="form-control" name="relationship_type" id="_wtrelationship_type">
            <option value="correlation_coefficient">Correlation coefficient</option>
            <option value="mutual_rank">Mutual rank</option>
          </select>
        </div>
      </div>
      <div class="col-sm-4">
        <div class="form-group">
          <label class="control-label" for="wt_threshold">Threshold</label>
          <input class="form-control" type="number" name="threshold" id="wt_threshold" placeholder="Threshold" value="0.85" step="0.01" min="0">
        </div>
      </div>
    </div>
    <div class="form-group">
      <button class="btn btn-primary" type="submit"><i class="fa fa-search"></i> Search</button>
    </div>
  </form>

  <div class="results">
  </div>
</div>
```

```javascript
/*global _*/
/*jshint camelcase: false*/
(function(window, $, _, undefined) {
  'use strict';

  console.log('Hello, workshop tutorial!');

  var appContext = $('[data-app-name="workshop-tutorial"]');

  /* Wait for Agave to Bootstrap before executing our code. */
  window.addEventListener('Agave::ready', function() {
    var Agave = window.Agave;

    var templates = {
      resultTable: _.template('<table class="table"><thead><tr><th>Related Locus</th><th>Direction</th><th>Score</th></tr></thead><tbody><% _.each(result, function(r) { %><tr><td><%= r.related_entity %> <button name="gene-report" data-locus="<%= r.related_entity %>" class="btn btn-link btn-sm"><i class="fa fa-book"></i><span class="sr-only">Get Gene Report</span></button></td><td><%= r.relationships[0].direction %></td><td><%= _.values(r.relationships[0].scores[0])[0] %></td></tr><% }) %></tbody></table>'),
      geneReport: _.template('<div class="modal fade"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" data-dismiss="modal" class="close"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button><h4>Gene Report: <%= locus %></h4></div><div class="modal-body"><% _.each(properties, function(prop) { %><h3><%= prop.type.replace("_"," ") %></h3><p><%= prop.value %></p><% }) %></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>')
    };

    var showResults = function( json ) {

      // show error message for invalid object
      if ( ! ( json && json.obj ) ) {
        $( '.results', appContext ).html( '<div class="alert alert-danger">Invalid response!</div>' );
        return;
      }

      $( '.results', appContext ).html( templates.resultTable( json.obj ) );

      $( 'button[name=gene-report]', appContext ).on('click', function( e ) {
        e.preventDefault();

        var locus = $(this).attr('data-locus');

        var query = {
          locus: locus
        };

        Agave.api.adama.search(
          {'namespace': 'aip', 'service': 'locus_gene_report_v0.1', 'queryParams': query},
          function(search) {
            var html = templates.geneReport(search.obj.result[0]);
            $(html).appendTo('body').modal();
          }
        );
      });

      $( '.results table', appContext ).dataTable();
    };


    $( 'form', appContext ).on('submit', function(e) {
      e.preventDefault();
      // showResults( $(this).serializeArray() );

      // STEP 2.1
      // showResults( this.locus.value );

      // STEP 2.2
      var query = {
        locus: this.locus.value,
        relationship_type: this.relationship_type.value,
        threshold: this.threshold.value
      };
      Agave.api.adama.search({
        'namespace': 'aip', 'service': 'atted_coexpressed_by_locus_v0.1', 'queryParams': query
      }, showResults);
    });

  });

})(window, jQuery, _);
```

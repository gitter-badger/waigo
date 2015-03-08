var React = require('react');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      routes: [],
      filter: '',
      loaded: false,
      error: null,
    };
  },


  _onFilterChange: function(e) {
    this.setState({
      filter: $(e.target).val()
    });
  },

  _buildRoutesList: function() {
    if (this.state.loaded) {
      var routes = [];

      // 'one of these' --> ['one', 'of', 'these']
      var filter = this.state.filter.toLowerCase().split(' ');

      var routes = this.state.routes.filter(function(r) {
        // ensure every filter keyword is matched
        for (var i=0; i<filter.length; ++i) {
          if (0 > r.key.indexOf(filter[i])) {
            return false;
          }
        }

        return true;
        
      }).map(function(r) {
        return (
          <div className="item" key={r.key}>
            <div className="content">
              <div className="header">
                <span className="method">{r.method.toUpperCase()}</span>
                <span className="url">{r.url}</span>
              </div>
            </div>
          </div>
        );
      });


      return (
        <div>
          <input 
            className="list-filter" 
            type="text" 
            onChange={this._onFilterChange}
            onKeyUp={this._onFilterChange}
            onKeyDown={this._onFilterChange}
            placeholder="Filter..." />
          <div className="ui divided list">{routes}</div>
        </div>
      );
    } else {
      return (
        <div className="loading">Loading...</div>
      )
    }
  },


  render: function() { 
    var error = (this.state.error ? <div className="error">{this.state.error}</div> : '');
    
    return (
      <div className="page-routes">
        {error}
        {this._buildRoutesList()}
      </div>
    );
  },


  componentDidMount: function() {
    var self = this;

    $.getJSON('/admin/routes?format=json')
      .done(function(data){        
        if (self.isMounted()) {
          self.setState({
            routes: data.routes.map(function(r) {
              // GET /example/path  -- >  get/example/path
              r.key = r.method.toLowerCase() + r.url.toLowerCase();

              return r;
            })
          });
        }
      })
      .fail(function(err) {
        self.setState({
          error: err.toString()
        });
      })
      .always(function() {
        self.setState({
          loaded: true
        });
      })
    ;
  },
});

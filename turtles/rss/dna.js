/*
 * FlatTurtle
 * @author: Johan Dams (johan.dams@wrdsystems.co.uk)
 * @author: Jens Segers (jens@irail.be)
 * @author: Michiel Vancoillie (michiel@irail.be)
 * @author: Pieter Colpaert (pieter@flatturtle.com)
 * @license: AGPLv3
 */

(function($) {

    var collection = Backbone.Collection.extend({
        initialize : function(models, options) {
            var self = this;
	    this.options = options;

            log.debug("TURTLE - RSS - Initialize");
            // prevents loss of "this" inside methods
            _.bindAll(this, "refresh");

	    // default error value
	    options.error = false;
	
	    // default limit
	    if (!options.limit)
		options.limit = 5;
	    
            setTimeout(function(){
		refreshInterval = setInterval(self.refresh, 480000);
	    }, Math.round(Math.random()*5000));

            // fetch data when born
            this.on("refresh", this.refresh);
            this.on("reconfigure", this.refresh);
            self.refresh();
        },
        refresh : function() {
            log.debug("TURTLE - RSS - Refresh");
            // don't fetch if there is no feed
            if (this.options.feed == null || !this.options.feed)
                return;

            var self = this;

            var feed = ["https://data.flatturtle.com/rsstojson.php?url=", this.options.feed];

	    $.getJSON(feed.join(""),function(result){
                if (!result.error) {
                    self.json = result;
                    self.parse();
                    self.trigger("reset");
                }else{
                    log.error("TURTLE - RSS - Can't fetch results: ", result.error.message);
                    // will allow the view to detect errors
                    self.options.error = true;

                    if(result.error.code == 400){
                        self.options.error_message = "The feed is unavailable at the moment";
                    }
                    // if there are no previous items to show, display error message
                    if (self.length == 0)
                        self.trigger("reset");
                }
            });
        },
        parse : function(json) {
            log.info("TURTLE - RSS - Parse results");

            var entries = new Object();
            var json = this.json;
	    
            try{
                this.options.source = json.title;
                var items = json.entries.slice(0, this.options.limit - 1);
	
                for (var i in items) {    

                    //var time = new Date(items[i].publishedDate);
                    //items[i].time = time.format("{d}, {m}/{y} {H}:{M}");
                    // Determine type
                    if(items[i].enclosure && items[i].enclosure.href != null && !items[i].summary){
                        entries.type_images = true;
                        if(!entries.rss_images)
                            entries.rss_images = new Array();
                        entries.rss_images.push(items[i]);
                    }else{
                        if(!entries.rss_feeds)
                            entries.rss_feeds = new Array();
                        entries.rss_feeds.push(items[i]);
                    }
                }
            }catch(e){
                log.warn("TURTLE - RSS - Can't parse results");
            }
            this.options.entries = entries;
            // return only limited number if items
            return entries;
        }
    });

    var view = Backbone.View.extend({
        initialize : function() {
            log.debug("TURTLE - RSS - Initialize view");
            // prevents loss of "this" inside methods
            _.bindAll(this, "render");

            // bind render to collection reset
            this.collection.on("reset", this.render);

            // pre-fetch template file and render when ready
            var self = this;
            if(this.template == null) {
                $.get("turtles/rss/views/widget.html", function(template) {
                    self.template = template;
                    self.render();
                });
            }
        },
        render : function() {
            log.debug("TURTLE - RSS - Refresh view");
            // only render when template file is loaded
            
            if (this.template && typeof this.options.entries !== "undefined") {

                var data = {
                    error : this.options.error,
                    error_message : this.options.error_message,
                    source : this.options.source,
                    entries : this.options.entries
                };

                // add html to container
                this.$el.empty();
                this.$el.html(Mustache.render(this.template, data));

                if(data.entries.length > 0 && data.entries[0].type_images){
                    // change turtle padding for imagewall
                    this.$el.addClass("nopadding");
                }else{
                    this.$el.removeClass("nopadding");
                }
            }
        }
    });

    // register turtle
    Turtles.register("rss", {
        collection : collection,
        view : view
    });

})(jQuery);

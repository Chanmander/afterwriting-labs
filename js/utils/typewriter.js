define(function(require) {
    var jsPDF = require('jspdf'),
        data = require('modules/data'),
        helper = require('utils/helper');

    var module = {};

    var split_color = function(color) {
        return color.substr(1).match(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/).slice(1).map(function(hex) {
            return parseInt(hex, 16);
        });
    };

    module.get_pdf = function(parsed, cfg) {

        var lines = parsed.lines;

        var title_token = data.get_title_page_token('title');
        var author_token = data.get_title_page_token('author');
        if (!author_token) {
            author_token = data.get_title_page_token('authors');
        }

        var properties = {
            title: title_token ? title_token.text : '',
            author: author_token ? author_token.text : '',
            creator: 'afterwriting.com'
        };

        // set up document
        var doc = new jsPDF("p", "in", cfg.print().paper_size || "a4");
        doc.setProperties(properties);
        doc.setFont("courier").setFontSize(12);

        // helper
        var center = function(txt, y) {
            var feed = (cfg.print().page_width - txt.length * cfg.print().font_width) / 2;
            doc.text(feed, y, txt);
        };

        // formatting not supported yet
        parsed.title_page.forEach(function(title_page_token) {
            title_page_token.text = title_page_token.text.replace(/\*/g, '').replace(/_/g, '');
        });

        var title_y = cfg.print().title_page.top_start;

        var title_page_next_line = function() {
            title_y += cfg.print().line_spacing * cfg.print().font_height;
        };

        var title_page_main = function(type, options) {
            options = options || {};
            if (type === undefined) {
                title_page_next_line();
                return;
            }
            var token = data.get_title_page_token(type);
            if (token) {
                token.text.split('\n').forEach(function(line) {
                    if (options.capitalize) {
                        line = line.toUpperCase();
                    }
                    center(line, title_y);
                    title_page_next_line();
                });
            }
        };

        if (cfg.print_title_page) {

            // title page
            title_page_main('title', {capitalize: true});
            title_page_main();
            title_page_main();
            title_page_main('credit');
            title_page_main();
            title_page_main('author');
            title_page_main();
            title_page_main();
            title_page_main();
            title_page_main();
            title_page_main('source');

            var draft = data.get_title_page_token('draft date');
            doc.text(cfg.print().title_page.draft_date.x, cfg.print().title_page.draft_date.y, draft ? draft.text.trim() : "");
            var contact = data.get_title_page_token('contact');
            doc.text(cfg.print().title_page.contact.x, cfg.print().title_page.contact.y, contact ? contact.text.trim() : "");

            var notes_and_copy = '';
            var notes = data.get_title_page_token('notes');
            var copy = data.get_title_page_token('copyright');
            notes_and_copy = notes ? (notes.text.trim() + "\n") : '';
            notes_and_copy += copy ? copy.text.trim() : '';
            doc.text(cfg.print().title_page.notes.x, cfg.print().title_page.notes.y, notes_and_copy);

            var date = data.get_title_page_token('date');
            doc.text(cfg.print().title_page.date.x, cfg.print().title_page.date.y, date ? date.text.trim() : "");

            // script
            doc.addPage();
        }

        // rest
        var y = 1;
        var page = 1;

        var current_section_level = 0, section_number = helper.version_generator();
        var text;

        lines.forEach(function(line) {
            if (line.type === "page_break") {
                y = 1;
                doc.addPage();
                page++;

                if (cfg.show_page_numbers) {
                    var page_num = page.toFixed() + ".";
                    doc.text(cfg.print().action.feed + cfg.print().action.max * cfg.print().font_width - page_num.length * cfg.print().font_width, cfg.print().page_number_top_margin, page_num);
                }
            } else {
                // formatting not supported yet
                text = line.text.replace(/\*/g, '').replace(/_/g, '');
                text = text.trim();

                var color = (cfg.print()[line.type] && cfg.print()[line.type].color) || '#000000';
                doc.setTextColor.apply(doc, split_color(color));

                if (line.type === 'centered') {
                    center(text, cfg.print().top_margin + cfg.print().font_height * y++);
                } else {
                    var feed = (cfg.print()[line.type] || {}).feed || cfg.print().action.feed;
                    if (line.type === "transition") {
                        feed = cfg.print().action.feed + cfg.print().action.max * 0.1 - line.text.length * 0.1;
                    }
                    if (line.type === "scene_heading" && cfg.embolden_scene_headers) {
                        doc.setFontType("bold");
                    } else {
                        doc.setFontType("normal");
                    }

                    if (line.type === 'section') {
                        current_section_level = line.token.level;
                        feed += current_section_level * cfg.print().section.level_indent;
                        if (cfg.number_sections) {
                            text = section_number(line.token.level) + '. ' + text;
                        }
                    } else if (line.type === 'synopsis') {
                        feed += cfg.print().synopsis.padding || 0;
                        if (cfg.print().synopsis.feed_with_last_section) {
                            feed += current_section_level * cfg.print().section.level_indent;
                        }
                    }


                    if (cfg.print()[line.type] && cfg.print()[line.type].italic) {
                        doc.setFontType('italic');
                    }

                    if (line.token && line.token.dual) {
                        if (line.right_column) {
                            var y_right = y;
                            line.right_column.forEach(function(line) {
                                var feed_right = (cfg.print()[line.type] || {}).feed || cfg.print().action.feed;
                                var text_right = line.text.replace(/\*/g, '').replace(/_/g, '');
                                feed_right -= (feed_right - cfg.print().left_margin) / 2;
                                feed_right += (cfg.print().page_width - cfg.print().right_margin - cfg.print().left_margin) / 2;
                                doc.text(feed_right, cfg.print().top_margin + cfg.print().font_height * y_right++, text_right);
                            });
                        }

                        feed -= (feed - cfg.print().left_margin) / 2;
                    }

                    doc.text(feed, cfg.print().top_margin + cfg.print().font_height * y++, text);
                    doc.setTextColor(0);
                    doc.setFontType('normal');
                }
            }

        });
        return doc;
    };

    return module;
});
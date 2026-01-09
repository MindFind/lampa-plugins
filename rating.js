(function () {
    'use strict';

    // ────────────────────────────────────────────────
    // Плагин: Только IMDb + голоса в полной карточке
    // Ключ OMDb: 479575b3 (не публикуй публично!)
    // ────────────────────────────────────────────────

    var API_KEY = '479575b3';
    var CACHE_TIME = 60 * 60 * 24 * 7 * 1000; // 7 дней
    var CACHE_NAME = 'imdb_rating_cache';

    function getIMDBRating(card) {
        var network = new Lampa.Reguest();
        var imdb_id = card.imdb_id;

        // Проверяем кэш
        var cached = getCache(card.id);
        if (cached !== false) {
            showRating(cached.rating, cached.votes);
            return;
        }

        if (!imdb_id || !imdb_id.startsWith('tt')) {
            showRating('—', 'N/A');
            setCache(card.id, { rating: '—', votes: 'N/A' });
            return;
        }

        var url = 'https://www.omdbapi.com/?i=' + imdb_id + '&apikey=' + API_KEY;

        network.silent(url, function (json) {
            var data = extractData(json);
            setCache(card.id, data);
            showRating(data.rating, data.votes);
        }, function () {
            var data = { rating: '—', votes: 'N/A' };
            setCache(card.id, data);
            showRating(data.rating, data.votes);
        }, false, { timeout: 10000 });
    }

    function extractData(json) {
        if (json && json.Response === 'True') {
            var rating = (json.imdbRating && json.imdbRating !== 'N/A') 
                ? parseFloat(json.imdbRating).toFixed(1) 
                : '—';

            var votes = json.imdbVotes || 'N/A';
            if (votes !== 'N/A') {
                var num = parseInt(votes.replace(/,/g, '')) || 0;
                if (num > 1000000) {
                    votes = (num / 1000000).toFixed(1) + 'M';
                } else if (num > 1000) {
                    votes = Math.round(num / 1000) + 'K';
                } else {
                    votes = num.toLocaleString();
                }
            }

            return { rating: rating, votes: votes };
        }
        return { rating: '—', votes: 'N/A' };
    }

    function showRating(rating, votes) {
        var render = Lampa.Activity.active().activity.render();
        $('.wait_rating', render).remove();

        var text = rating || '—';
        if (votes && votes !== 'N/A') {
            text += ' <small>(' + votes + ')</small>';
        }

        $('.rate--imdb', render)
            .removeClass('hide')
            .find('> div').eq(0)
            .html(text);

        // Прячем все ненужные рейтинги
        $('.rate--tmdb', render).addClass('hide');
        $('.rate--kp', render).addClass('hide');
    }

    // Кэш
    function getCache(movieId) {
        var timestamp = Date.now();
        var cache = Lampa.Storage.cache(CACHE_NAME, 500, {});
        if (cache[movieId]) {
            if (timestamp - cache[movieId].time > CACHE_TIME) {
                delete cache[movieId];
                Lampa.Storage.set(CACHE_NAME, cache);
                return false;
            }
            return cache[movieId];
        }
        return false;
    }

    function setCache(movieId, data) {
        var cache = Lampa.Storage.cache(CACHE_NAME, 500, {});
        cache[movieId] = {
            ...data,
            time: Date.now()
        };
        Lampa.Storage.set(CACHE_NAME, cache);
    }

    // Запуск
    function startPlugin() {
        if (window.imdb_only_full_plugin) return;
        window.imdb_only_full_plugin = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var render = e.object.activity.render();
            if ($('.rate--imdb', render).hasClass('hide') && !$('.wait_rating', render).length) {
                $('.info__rate, .full-start-new__rate-line', render).after(
                    '<div style="width:2.2em;margin:1em 1em 0 0;" class="wait_rating">' +
                    '<div class="broadcast__scan"><div></div></div></div>'
                );

                getIMDBRating(e.data.movie || {});
            }
        });
    }

    if (!window.imdb_only_full_plugin) startPlugin();
})();

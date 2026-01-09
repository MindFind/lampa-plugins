(function () {
    'use strict';

    // Плагин: Только IMDb рейтинг в полной карточке (без голосов)
    // Ключ OMDb: 479575b3 (не публикуй публично!)
    // Последнее обновление: чистый рейтинг без наездов

    var API_KEY = '479575b3';
    var CACHE_TIME = 60 * 60 * 24 * 7 * 1000; // 7 дней
    var CACHE_NAME = 'imdb_rating_cache';

    function getIMDBRating(card) {
        var network = new Lampa.Reguest();
        var imdb_id = card.imdb_id;

        var cached = getCache(card.id);
        if (cached !== false) {
            showRating(cached);
            return;
        }

        if (!imdb_id || !imdb_id.startsWith('tt')) {
            showRating('—');
            setCache(card.id, '—');
            return;
        }

        var url = 'https://www.omdbapi.com/?i=' + imdb_id + '&apikey=' + API_KEY;

        network.silent(url, function (json) {
            var rating = extractRating(json);
            setCache(card.id, rating);
            showRating(rating);
        }, function () {
            setCache(card.id, '—');
            showRating('—');
        }, false, { timeout: 10000 });
    }

    function extractRating(json) {
        if (json && json.Response === 'True' && json.imdbRating && json.imdbRating !== 'N/A') {
            return parseFloat(json.imdbRating).toFixed(1);
        }
        return '—';
    }

    function showRating(rating) {
        var render = Lampa.Activity.active().activity.render();
        $('.wait_rating', render).remove();

        // Показываем чистый рейтинг IMDb
        $('.rate--imdb', render)
            .removeClass('hide')
            .css({
                'display': 'inline-flex !important',
                'align-items': 'center',
                'min-width': '80px',
                'padding-right': '0.8em',
                'margin-right': '1em'
            })
            .find('> div').eq(0)
            .text(rating || '—');

        // Полностью удаляем TMDB и KP
        $('.rate--tmdb, .rate--kp', render).remove();

        // Корректируем строку рейтингов
        $('.full-start-new__rate-line', render).css({
            'display': 'flex',
            'align-items': 'center',
            'gap': '0.8em',
            'justify-content': 'flex-start',
            'flex-wrap': 'nowrap'
        });
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

    function setCache(movieId, rating) {
        var cache = Lampa.Storage.cache(CACHE_NAME, 500, {});
        cache[movieId] = {
            rating: rating,
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

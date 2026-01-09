(function () {
    'use strict';

    // Плагин: Чистый IMDb рейтинг + адаптивный чёрный квадрат с голосами перед возрастным рейтингом
    // Ключ OMDb: 479575b3 (не публикуй публично!)

    var API_KEY = '479575b3';
    var CACHE_TIME = 60 * 60 * 24 * 7 * 1000; // 7 дней
    var CACHE_NAME = 'imdb_clean_cache';

    function getIMDBRating(card) {
        var network = new Lampa.Reguest();
        var imdb_id = card.imdb_id;

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
        var rating = (json && json.Response === 'True' && json.imdbRating && json.imdbRating !== 'N/A')
            ? parseFloat(json.imdbRating).toFixed(1)
            : '—';

        var votesRaw = json && json.imdbVotes ? json.imdbVotes : 'N/A';
        var votesFormatted = 'N/A';

        if (votesRaw !== 'N/A') {
            var num = parseInt(votesRaw.replace(/,/g, '')) || 0;
            if (num > 1000000) {
                votesFormatted = (num / 1000000).toFixed(1) + 'M';
            } else if (num > 1000) {
                votesFormatted = Math.round(num / 1000) + 'K';
            } else {
                votesFormatted = num.toLocaleString();
            }
        }

        return { rating: rating, votes: votesFormatted };
    }

    function showRating(rating, votes) {
        var render = Lampa.Activity.active().activity.render();
        $('.wait_rating', render).remove();

        // Чистый рейтинг IMDb
        $('.rate--imdb', render)
            .removeClass('hide')
            .css({
                'display': 'inline-flex !important',
                'align-items': 'center',
                'background': 'none !important',
                'border': 'none !important',
                'padding': '0 !important',
                'margin': '0 !important',
                'min-width': 'auto'
            })
            .find('> div').eq(0)
            .text(rating || '—');

        // Удаляем старые TMDB и KP
        $('.rate--tmdb, .rate--kp', render).remove();

        // Добавляем адаптивный чёрный квадрат с голосами перед возрастным рейтингом
        var ageBlock = $('.full-start__pg', render);
        if (ageBlock.length && votes !== 'N/A') {
            ageBlock.before(
                '<div class="imdb-votes-box" style="' +
                'background: #000 !important;' +
                'color: #fff !important;' +
                'font-size: 11px !important;' +
                'padding: 4px 8px !important;' +
                'border-radius: 6px !important;' +
                'margin-right: 0.6em !important;' +
                'display: inline-flex !important;' +
                'align-items: center !important;' +
                'justify-content: center !important;' +
                'min-width: 32px !important;' +     // минимум, чтобы был квадратным
                'min-height: 22px !important;' +
                'white-space: nowrap !important;' + // не переносим текст
                'line-height: 1 !important;' +
                '">' + votes + '</div>'
            );
        }

        // Сжимаем строку рейтингов
        $('.full-start-new__rate-line', render).css({
            'display': 'flex',
            'align-items': 'center',
            'gap': '0.4em',
            'justify-content': 'flex-start',
            'flex-wrap': 'nowrap',
            'padding': '0',
            'margin': '0',
            'background': 'none !important'
        });
    }

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
            rating: data.rating,
            votes: data.votes,
            time: Date.now()
        };
        Lampa.Storage.set(CACHE_NAME, cache);
    }

    function startPlugin() {
        if (window.imdb_clean_plugin) return;
        window.imdb_clean_plugin = true;

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

    if (!window.imdb_clean_plugin) startPlugin();
})();

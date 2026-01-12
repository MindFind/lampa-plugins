(function () {
    'use strict';

    // Плагин: IMDb рейтинг + блок голосов — точная копия стиля .rate--imdb
    // Ключ OMDb: 479575b3

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
        return { rating: rating, votes: votesRaw };
    }

    function showRating(rating, votes) {
        var render = Lampa.Activity.active().activity.render();
        $('.wait_rating', render).remove();

        // IMDb блок (оценка)
        var imdbBlock = $('.rate--imdb', render).removeClass('hide');
        imdbBlock.find('> div').eq(0).text(rating || '—');

        // Удаляем TMDB и KP
        $('.rate--tmdb, .rate--kp', render).remove();

        // Блок голосов — точная копия стиля .rate--imdb
        if (votes !== 'N/A') {
            // Копируем ВСЕ классы с блока IMDB
            var votesBox = $('<div></div>')
                .addClass(imdbBlock.attr('class'))  // все классы, включая rate--imdb
                .addClass('imdb-votes-box')          // наш класс для отличия (если нужно)
                .css(window.getComputedStyle(imdbBlock[0]))  // копируем ВСЕ вычисленные стили
                .text(votes);  // полное число голосов

            // Вставляем перед блоком оценки IMDb
            imdbBlock.before(votesBox);
        }

        // Настройка flex-контейнера
        $('.full-start-new__rate-line', render).css({
            'display': 'flex',
            'align-items': 'center',
            'gap': '0.5em',
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

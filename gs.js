(function () {
    'use strict';

    // === IMDb рейтинг + голоса (архитектурно корректная версия) ===
    // OMDb API
    var API_KEY = '479575b3';

    // Кэш: 7 дней
    var CACHE_TIME = 60 * 60 * 24 * 7 * 1000;
    var CACHE_NAME = 'imdb_clean_cache';

    // === Получение IMDb рейтинга ===
    function getIMDBRating(card) {
        var network = new Lampa.Reguest();
        var imdb_id = card.imdb_id;

        // Проверка кэша
        var cached = getCache(card.id);
        if (cached !== false) {
            showRating(cached.rating, cached.votes);
            return;
        }

        // Нет IMDb ID
        if (!imdb_id || !imdb_id.startsWith('tt')) {
            var empty = { rating: '—', votes: 'N/A' };
            setCache(card.id, empty);
            showRating(empty.rating, empty.votes);
            return;
        }

        var url = 'https://www.omdbapi.com/?i=' + imdb_id + '&apikey=' + API_KEY;

        network.silent(url, function (json) {
            var data = extractData(json);
            setCache(card.id, data);
            showRating(data.rating, data.votes);
        }, function () {
            var fail = { rating: '—', votes: 'N/A' };
            setCache(card.id, fail);
            showRating(fail.rating, fail.votes);
        }, false, { timeout: 10000 });
    }

    // === Извлечение данных OMDb ===
    function extractData(json) {
        var rating = (json && json.Response === 'True' && json.imdbRating && json.imdbRating !== 'N/A')
            ? parseFloat(json.imdbRating).toFixed(1)
            : '—';

        var votes = (json && json.imdbVotes) ? json.imdbVotes : 'N/A';

        return {
            rating: rating,
            votes: votes
        };
    }

    // === Отрисовка рейтинга ===
    function showRating(rating, votes) {
        var activity = Lampa.Activity.active();
        if (!activity) return;

        var render = activity.activity.render();

        // Убираем лоадер
        $('.wait_rating', render).remove();

        // IMDb блок
        var imdbBlock = $('.rate--imdb', render).removeClass('hide');
        if (!imdbBlock.length) return;

        // Устанавливаем рейтинг
        imdbBlock.find('> div').eq(0).text(rating || '—');

        // Удаляем TMDB и KP
        $('.rate--tmdb, .rate--kp', render).remove();

        // === КАПСУЛА ГОЛОСОВ (типографический клон IMDb) ===
        if (votes !== 'N/A') {

            // Источник типографики — внутренняя IMDb-пилюля
            var imdbRate = imdbBlock.find('.full-start__rate')[0];

            if (imdbRate) {
                var cs = window.getComputedStyle(imdbRate);

                var votesBox = $('<div></div>')
                    .addClass('full-start__rate imdb-votes-box')
                    .text(votes)
                    .css({
                        background: '#c2410c',
                        color: '#fff',

                        // Полное наследование типографики IMDb
                        fontFamily: cs.fontFamily,
                        fontSize: cs.fontSize,
                        fontWeight: cs.fontWeight,
                        lineHeight: cs.lineHeight,
                        letterSpacing: cs.letterSpacing,

                        // Геометрия IMDb (padding = 0)
                        padding: '0',
                        borderRadius: cs.borderRadius,
                        boxSizing: 'border-box'
                    });

                // Вставляем ПЕРЕД IMDb
                imdbBlock.before(votesBox);
            }
        }

        // === Flex-контейнер ===
        $('.full-start-new__rate-line', render).css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            justifyContent: 'flex-start',
            flexWrap: 'nowrap',
            padding: '0',
            margin: '0',
            background: 'none'
        });
    }

    // === Кэш ===
    function getCache(movieId) {
        var now = Date.now();
        var cache = Lampa.Storage.cache(CACHE_NAME, 500, {});

        if (cache[movieId]) {
            if (now - cache[movieId].time > CACHE_TIME) {
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

    // === Запуск плагина ===
    function startPlugin() {
        if (window.imdb_clean_plugin) return;
        window.imdb_clean_plugin = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var render = e.object.activity.render();

            if ($('.rate--imdb', render).hasClass('hide') &&
                !$('.wait_rating', render).length) {

                // Лоадер
                $('.info__rate, .full-start-new__rate-line', render).after(
                    '<div style="width:2.2em;margin:1em 1em 0 0;" class="wait_rating">' +
                    '<div class="broadcast__scan"><div></div></div>' +
                    '</div>'
                );

                getIMDBRating(e.data.movie || {});
            }
        });
    }

    if (!window.imdb_clean_plugin) startPlugin();

})();

(function () {
    'use strict';

    // Плагин: Чистый IMDb рейтинг + блок с полным числом голосов (тёмно-оранжевый)
    // Ключ OMDb: 479575b3 (не публикуй публично!)

    var API_KEY = '479575b3';
    var CACHE_TIME = 60 * 60 * 24 * 7 * 1000; // 7 дней
    var CACHE_NAME = 'imdb_clean_cache';

    // Получение рейтинга IMDb
    function getIMDBRating(card) {
        var network = new Lampa.Reguest();
        var imdb_id = card.imdb_id;

        // Проверяем кэш
        var cached = getCache(card.id);
        if (cached !== false) {
            showRating(cached.rating, cached.votes);
            return;
        }

        // Если нет IMDb ID
        if (!imdb_id || !imdb_id.startsWith('tt')) {
            showRating('—', 'N/A');
            setCache(card.id, { rating: '—', votes: 'N/A' });
            return;
        }

        var url = 'https://www.omdbapi.com/?i=' + imdb_id + '&apikey=' + API_KEY;

        // Запрос к OMDb
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

    // Извлекаем рейтинг и голоса
    function extractData(json) {
        var rating = (json && json.Response === 'True' && json.imdbRating && json.imdbRating !== 'N/A')
            ? parseFloat(json.imdbRating).toFixed(1)
            : '—';

        var votesRaw = json && json.imdbVotes ? json.imdbVotes : 'N/A';

        // OMDb уже отдаёт формат "654,005"
        return { rating: rating, votes: votesRaw };
    }

    // Отображение рейтинга и голосов
    function showRating(rating, votes) {
        var render = Lampa.Activity.active().activity.render();
        $('.wait_rating', render).remove();

        // Чистый IMDb рейтинг
        var imdbBlock = $('.rate--imdb', render)
            .removeClass('hide');

        imdbBlock.find('> div').eq(0).text(rating || '—');

        // Удаляем TMDB и KP
        $('.rate--tmdb, .rate--kp', render).remove();

        // Flex-контейнер рейтингов
        var rateLine = $('.full-start-new__rate-line', render);

        // Создаём блок голосов
        if (rateLine.length && votes !== 'N/A') {

            // Берём реальные стили IMDb-пилюли (высота, шрифт, радиус)
            var imdb = imdbBlock[0];
            var cs = window.getComputedStyle(imdb);

            // Формируем стиль, полностью совпадающий с IMDb по размерам
            var style = `
                display:inline-flex;
                align-items:center;
                justify-content:center;

                height:${cs.height};
                line-height:${cs.lineHeight};
                font-size:${cs.fontSize};
                border-radius:${cs.borderRadius};

                padding:0 12px;
                background:#c2410c; /* твой оранжевый цвет */
                color:#fff;
                font-weight:bold;
                white-space:nowrap;
                box-sizing:border-box;
                margin-left:0.5em;
            `;

            // Вставляем в flex-контейнер
            rateLine.append(`<div class="imdb-votes-box" style="${style}">${votes}</div>`);
        }

        // Настройки flex-контейнера
        rateLine.css({
            'display': 'flex',
            'align-items': 'center',
            'gap': '0.5em',
            'justify-content': 'flex-start',
            'flex-wrap': 'nowrap',
            'padding': '0',
            'margin': '0',
            'background': 'none'
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

    function setCache(movieId, data) {
        var cache = Lampa.Storage.cache(CACHE_NAME, 500, {});
        cache[movieId] = {
            rating: data.rating,
            votes: data.votes,
            time: Date.now()
        };
        Lampa.Storage.set(CACHE_NAME, cache);
    }

    // Запуск плагина
    function startPlugin() {
        if (window.imdb_clean_plugin) return;
        window.imdb_clean_plugin = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var render = e.object.activity.render();
            if ($('.rate--imdb', render).hasClass('hide') && !$('.wait_rating', render).length) {

                // Анимация загрузки
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

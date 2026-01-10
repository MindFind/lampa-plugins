(function () {
    'use strict';

    // Плагин: IMDb рейтинг + количество голосов (адаптивный, масштабируемый)
    // Ключ OMDb: 479575b3
    // Логика: сначала показываем количество голосов, затем IMDb рейтинг.
    // Геометрия пилюли копируется с IMDb, кроме фона (он наш — оранжевый).
    // Масштабируемость обеспечивается использованием класса full-start__rate.

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

        return { rating: rating, votes: votesRaw };
    }

    // Отображение рейтинга и голосов
    function showRating(rating, votes) {
        var render = Lampa.Activity.active().activity.render();
        $('.wait_rating', render).remove();

        // IMDb блок
        var imdbBlock = $('.rate--imdb', render).removeClass('hide');

        // Устанавливаем рейтинг
        imdbBlock.find('> div').eq(0).text(rating || '—');

        // Удаляем TMDB и KP
        $('.rate--tmdb, .rate--kp', render).remove();

        // Создаём адаптивный блок голосов
        if (votes !== 'N/A') {

            // Берём геометрию IMDb-пилюли
            var imdb = imdbBlock[0];
            var cs = window.getComputedStyle(imdb);

            var votesBox = $('<div></div>')
                .addClass('full-start__rate imdb-votes-box') // даёт высоту, line-height, font-size, адаптивность
                .text(votes)
                .css({
                    'background': '#c2410c',     // наш фон
                    'color': '#fff',
                    'font-weight': 'bold',
                    'margin-right': '0.5em',

                    // Копируем всю геометрию, которую можно копировать безопасно
                    'padding-left': cs.paddingLeft,
                    'padding-right': cs.paddingRight,
                    'border-radius': cs.borderRadius
                });

            // ВСТАВЛЯЕМ ПЕРЕД IMDb (как ты хотел)
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

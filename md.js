function showRating(rating, votes) {
    var render = Lampa.Activity.active().activity.render();
    $('.wait_rating', render).remove();

    // IMDb блок (оценка)
    var imdbBlock = $('.rate--imdb', render).removeClass('hide');
    imdbBlock.find('> div').eq(0).text(rating || '—');

    // Удаляем TMDB и KP
    $('.rate--tmdb, .rate--kp', render).remove();

    // Оранжевый бокс с голосами — копируем стили по одному
    if (votes !== 'N/A') {
        var imdbStyle = window.getComputedStyle(imdbBlock[0]);

        var votesBox = $('<div></div>')
            .addClass('full-start__rate imdb-votes-box')
            .text(votes)
            .css({
                'background': '#c2410c',
                'color': '#fff',
                'font-weight': 'bold',
                'margin-right': '0.5em',
                'white-space': 'nowrap',
                'display': 'inline-flex',
                'align-items': 'center',
                'justify-content': 'center',

                // Копируем паддинги по одному (без ошибки)
                'padding-left': imdbStyle.paddingLeft,
                'padding-right': imdbStyle.paddingRight,
                'padding-top': imdbStyle.paddingTop,
                'padding-bottom': imdbStyle.paddingBottom,

                // Копируем скругление и другие ключевые стили
                'border-radius': imdbStyle.borderRadius,
                'box-sizing': imdbStyle.boxSizing,
                'font-size': imdbStyle.fontSize,
                'line-height': imdbStyle.lineHeight
            });

        // Вставляем перед оценкой IMDb
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

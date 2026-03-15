import gaman from './index';

gaman.get('/test', (ctx) => {
	return Res.send({ name: 'angga', anu: 'asda' })
		.meta({
			currentPage: 1,
			totalPages: 2,
			totalData: 3,
		})
    .error({
      "email": "email kamu salah!"
    });
});

gaman.listen();

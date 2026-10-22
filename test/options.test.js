const test = require('node:test');
const assert = require('node:assert');
const { buildOptionFields } = require('../dist/nodes/Lassocut/GenericFunctions');

const obj = (fields) => Object.fromEntries(fields.map((f) => [f.name, f.value]));

test('no new options: body unchanged', () => {
	const f = buildOptionFields({
		size: 'full', type: 'auto', format: 'png', background: '#FFF ', crop: true, cropMargin: '10%',
	});
	assert.deepStrictEqual(f.map((x) => x.name), ['size', 'type', 'format', 'bg_color', 'crop', 'crop_margin']);
	assert.strictEqual(obj(f).bg_color, 'FFF');
	assert.deepStrictEqual(buildOptionFields({ preset: 'none', shadow: 'none' }), []);
});

test('preset drops format, bg_color, crop, crop_margin', () => {
	const o = obj(buildOptionFields({
		size: 'full', preset: 'amazon', format: 'png', background: 'red', crop: true, cropMargin: '5px',
	}));
	assert.deepStrictEqual(o, { size: 'full', preset: 'amazon' });
});

test('preset with cast shadow sends the four shadow fields', () => {
	const o = obj(buildOptionFields({ preset: 'etsy', shadow: 'cast', shadowAngle: -30, shadowLength: 'long', shadowOpacity: 75 }));
	assert.deepStrictEqual(o, {
		preset: 'etsy', shadow_type: 'cast', shadow_angle: '-30', shadow_length: 'long', shadow_opacity: '75',
	});
});

test('zalando drops shadow', () => {
	const o = obj(buildOptionFields({ preset: 'zalando', shadow: 'cast' }));
	assert.deepStrictEqual(o, { preset: 'zalando' });
});

test('shadow without preset keeps format and bg_color, defaults applied', () => {
	const o = obj(buildOptionFields({ format: 'jpg', background: 'white', shadow: 'cast' }));
	assert.deepStrictEqual(o, {
		format: 'jpg', bg_color: 'white', shadow_type: 'cast', shadow_angle: '45', shadow_length: 'medium', shadow_opacity: '55',
	});
});

-- The store catalog (src/data/seed.js). Safe to re-run.
insert into public.categories (id, name, blurb, icon, sort) values ('hair-care', 'العناية بالشعر', 'زيوت للشعر لفروة صحية وأطراف ناعمة.', 'drop', 1) on conflict (id) do update set name = excluded.name, blurb = excluded.blurb, icon = excluded.icon, sort = excluded.sort;
insert into public.categories (id, name, blurb, icon, sort) values ('skin-care', 'العناية بالبشرة', 'صابونيات تقليدية لروتين الاستحمام وبشرة ناعمة.', 'leaf', 2) on conflict (id) do update set name = excluded.name, blurb = excluded.blurb, icon = excluded.icon, sort = excluded.sort;
insert into public.products (id, name, price, sale_price, category_id, image, badge, featured, sort, summary, description, active, digital, per_unit) values ('hair-oil', 'زيت الشعر', 130, null, 'hair-care', '/brand/products/hair-oil-v4.webp', '', true, 1, 'زيت للشعر تستخدمينه ثلاث مرات بالأسبوع على فروة الشعر وأطرافه، لروتين عناية يدلّع شعرك.', 'زيت الشعر من عناية ميمي، رفيقك في روتين العناية بشعرك. تدليك فروة الشعر بالزيت عادة جميلة توارثناها من أمهاتنا وجداتنا، ولحظة هدوء تعطين فيها شعرك وقته. وزّعيه على الفروة بأطراف أصابعك ومرّريه على الأطراف، وخلي شعرك يحس بالفرق مع الاستمرار.
## طريقة الاستخدام
- ثلاث مرات بالأسبوع
- وزّعي كمية مناسبة على فروة الشعر ودلّكيها بأطراف أصابعك بحركات دائرية
- مرّري الزيت على أطراف الشعر
- اغسلي شعرك بعدها بالشامبو المعتاد
## ملاحظات
- للاستخدام الخارجي فقط
- جرّبيه على جزء صغير قبل أول استخدام
- احفظيه بعيد عن الحرارة وأشعة الشمس، وسكّري العبوة زين بعد كل استخدام', true, false, null) on conflict (id) do nothing;
insert into public.products (id, name, price, sale_price, category_id, image, badge, featured, sort, summary, description, active, digital, per_unit) values ('turmeric-soap', 'صابونية الكركم', 90, null, 'skin-care', '/brand/products/turmeric-soap-v4.webp', '', true, 2, 'صابونية كريمية بالكركم الذهبي، تدلّعين فيها بشرتك وقت الاستحمام.', 'صابونية الكركم من عناية ميمي، خلطة صابونية ناعمة بلون الكركم الذهبي تضيفينها لروتين الاستحمام وتحسين بعدها بالانتعاش. الكركم من المكونات اللي استخدمتها الجدات من زمان في خلطات العناية بالبشرة، وجبناه لك في علبة تفتحينها كل مرة وتستمتعين.
## طريقة الاستخدام
- بلّلي بشرتك بالماء الدافي
- خذي كمية مناسبة ووزّعيها على البشرة بحركات دائرية
- اتركيها دقيقتين ثم اشطفيها بالماء زين
## ملاحظات
- للاستخدام الخارجي فقط
- جرّبيها على جزء صغير من البشرة قبل أول استخدام
- لون الكركم ممكن يعلق بالمناشف الفاتحة
- احفظيها بعيد عن الحرارة والرطوبة، وسكّري العلبة بعد كل استخدام', true, false, null) on conflict (id) do nothing;
insert into public.products (id, name, price, sale_price, category_id, image, badge, featured, sort, summary, description, active, digital, per_unit) values ('persian-akar-soap', 'صابونية العكر الفارسي', 90, null, 'skin-care', '/brand/products/persian-akar-soap-v4.webp', '', true, 3, 'صابونية بالعكر الفارسي، من أسرار العناية القديمة عند الخليجيات.', 'صابونية العكر الفارسي من عناية ميمي. العكر الفارسي من المكونات المعروفة في خلطات العناية التقليدية عند الخليجيات، وارتبط اسمه بالنضارة والدلع. حطّيناه لك في خلطة صابونية ناعمة تخلي وقت الاستحمام لحظة عناية فعلية.
## طريقة الاستخدام
- بلّلي بشرتك بالماء الدافي
- خذي كمية مناسبة ووزّعيها على البشرة بحركات دائرية
- اتركيها دقيقتين ثم اشطفيها بالماء زين
## ملاحظات
- للاستخدام الخارجي فقط
- جرّبيها على جزء صغير من البشرة قبل أول استخدام
- احفظيها بعيد عن الحرارة والرطوبة، وسكّري العلبة بعد كل استخدام', true, false, null) on conflict (id) do nothing;
insert into public.products (id, name, price, sale_price, category_id, image, badge, featured, sort, summary, description, active, digital, per_unit) values ('moroccan-nila-soap', 'صابونية النيلة المغربية', 90, null, 'skin-care', '/brand/products/moroccan-nila-soap-v4.webp', '', true, 4, 'صابونية بالنيلة الزرقاء المغربية، لمسة من طقوس الحمام المغربي في بيتك.', 'صابونية النيلة المغربية من عناية ميمي. النيلة الزرقاء من أشهر مكونات طقوس الحمام المغربي، وجبناها لك في خلطة صابونية ناعمة تعيشين فيها أجواء الحمام المغربي في بيتك.
## طريقة الاستخدام
- بلّلي بشرتك بالماء الدافي
- خذي كمية مناسبة ووزّعيها على البشرة بحركات دائرية
- اتركيها دقيقتين ثم اشطفيها بالماء زين
## ملاحظات
- للاستخدام الخارجي فقط
- جرّبيها على جزء صغير من البشرة قبل أول استخدام
- النيلة ممكن تترك لون أزرق خفيف على المناشف الفاتحة
- احفظيها بعيد عن الحرارة والرطوبة، وسكّري العلبة بعد كل استخدام', true, false, null) on conflict (id) do nothing;

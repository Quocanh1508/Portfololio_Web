Put your logo image here as logo.png (512x512 recommended, PNG with transparent background).


insert into public.profiles(id, username)
values ('<USER_UUID>', 'YourName')
on conflict (id) do nothing;

insert into public.api_keys(user_id, key_hash)
values ('<USER_UUID>', extensions.crypt('<PLAIN_KEY>', extensions.gen_salt('bf')))
on conflict (user_id) do update set key_hash = excluded.key_hash;

-- Test RPC (không cần đăng nhập)
select (submit_portfolio_item(
  'https://example.com',
  'Bài demo',
  'Mô tả ngắn',
  '<PLAIN_KEY>'
)).*;
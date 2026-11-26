<?php

return [
    'secret'      => env('JWT_SECRET'),
    'ttl_minutes' => (int) env('JWT_TTL_MINUTES', 60),
    'algo'        => 'HS256',
    'reset_dev_link' => (bool) env('PASSWORD_RESET_DEV_LINK', true),
    'frontend_url'   => env('FRONTEND_URL', 'http://localhost:4200'),
];

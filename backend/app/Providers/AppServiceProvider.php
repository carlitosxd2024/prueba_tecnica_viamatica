<?php

namespace App\Providers;

use App\Infrastructure\Persistence\SqlServerGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SqlServerGateway::class);
    }

    public function boot(): void
    {
        //
    }
}

<template>

    <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800">

        <!-- Primeira coluna -->
        <div class="md:w-2/3 flex flex-col">

            <div class="flex-1">
                <p class="flex-1 bg-purple-400">
                    1
                </p>
            </div>

            <div class="flex-1">
                <p class="bg-purple-400">
                    3
                </p>
            </div>

        </div>

        <!-- Segunda coluna -->
        <div class="w-full md:w-1/3 f-full flex flex-col">

            <div class="flex-1 md:h-[60%] md:min-h-[60%] order-2 md:order-1">
                <p class="flex-1 bg-purple-400">
                    2
                </p>
            </div>

            <div class="flex-1 h-[40%] order-1 md:order-2">
                <p class="flex-1 bg-purple-400">
                    4
                </p>
            </div>

        </div>

    </div>
</template>